import React, { useContext, useState } from 'react';
import { PostContext } from '../../../contextStore/PostContext';
import { AuthContext } from '../../../contextStore/AuthContext';
import { ToastContext } from '../../../contextStore/ToastContext';
import { OfferContext } from '../../../contextStore/OfferContext';
import { useHistory } from 'react-router';
import { supabase } from 'backend/config';
import { formatRelativeDate } from '../../../utils/formatters';
import ImageGallery from '../ImageGallery';
import AdActions from '../../AdActions/AdActions';
import FavoriteButton from '../../Favorites/FavoriteButton';
import SellerCard from '../SellerCard';
import ShareButtons from '../ShareButtons';
import SimilarAds from '../SimilarAds';
import SafetyTips from '../SafetyTips';
import ReportAd from '../ReportAd';
import MakeOfferModal from '../../Offers/MakeOfferModal';
import WatchButton from '../../Watchlist/WatchButton';
import AdAnalytics from '../../Analytics/AdAnalytics';
import PriceHistory from '../PriceHistory';
import ReviewList from '../../Reviews/ReviewList';
import { useViewData } from './useViewData';
import ViewMeta from './ViewMeta';
import ProductDetails from './ProductDetails';
import ProductDescription from './ProductDescription';
import '../View.css';

const ALLOWED_VIDEO_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'];

function isAllowedVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' && ALLOWED_VIDEO_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function getEmbedUrl(url) {
  if (!isAllowedVideoUrl(url)) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const v = parsed.searchParams.get('v');
    return v ? `https://www.youtube.com/embed/${v}` : null;
  } catch {
    return null;
  }
}

export default function View() {
  const { postContent, setPostContent } = useContext(PostContext);
  const { user } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext) || {};
  const [chatLoading, setChatLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const history = useHistory();

  const { sentOffers } = useContext(OfferContext) || {};
  const userId = user?.id || user?.uid;
  const postUserId = postContent?.user_id || postContent?.userId;

  const { userDetails, viewerIsPremium } = useViewData(postContent, history, userId);

  if (!postContent || postUserId === undefined) return null;

  const existingOffer = sentOffers?.find(o => o.productId === postContent.id);

  const imageList = postContent?.images?.length > 0 ? postContent.images : postContent?.url ? [postContent.url] : [];
  const isOwner = userId && postContent && userId === postUserId;
  const createdDate = postContent?.created_at ? new Date(postContent.created_at) : (postContent?.createdAt ? new Date(postContent.createdAt) : null);
  const dateLabel = formatRelativeDate(createdDate);
  const description = postContent.description || '';
  const showReadMore = description.length > 200;

  const handleChatWithSeller = async () => {
    if (!user) { history.push('/login'); return; }
    if (isOwner) return;
    setChatLoading(true);
    
    try {
      // Find or create conversation
      const { data: conv, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('product_id', postContent.id)
        .contains('participants', [userId, postUserId])
        .maybeSingle();

      if (error) throw error;

      if (conv) {
        history.push(`/chat/${conv.id}`);
      } else {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert([{
            product_id: postContent.id,
            buyer_id: userId,
            seller_id: postUserId,
            participants: [userId, postUserId],
            last_message: 'Interested in this ad',
          }])
          .select()
          .single();

        if (createError) throw createError;
        history.push(`/chat/${newConv.id}`);
      }
    } catch (err) {
      console.error('View: failed to handle chat', err);
      addToast?.(err?.message || 'Could not start chat. Please try again.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="viewParentDiv olxFadeIn">
      <ViewMeta postContent={postContent} imageList={imageList} />
      <div className="viewTopRow">
        <div className="imageShowDiv">
          <div className="viewFavoriteWrap">
            <FavoriteButton productId={postContent.id} />
            {!isOwner && <WatchButton productId={postContent.id} productName={postContent.name} currentPrice={postContent.price} />}
          </div>
          <ImageGallery images={imageList} />
        </div>
        <div className="rightSection">
          <ProductDetails postContent={postContent} dateLabel={dateLabel} />
          {postContent.video_url || postContent.videoUrl ? (
            <div className="viewVideoSection">
              <p className="p-bold">Video</p>
              {(() => {
                const videoUrl = postContent.video_url || postContent.videoUrl;
                const embedUrl = getEmbedUrl(videoUrl);
                if (embedUrl) {
                  return (
                    <iframe
                      title="Ad video"
                      src={embedUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="viewVideoEmbed"
                    />
                  );
                }
                const safe = isAllowedVideoUrl(videoUrl) ? videoUrl : null;
                return safe ? (
                  <a href={safe} target="_blank" rel="noopener noreferrer" className="viewVideoLink">Watch video</a>
                ) : (
                  <span className="viewVideoLink">Video link not available</span>
                );
              })()}
            </div>
          ) : null}
          {userDetails && (
            <SellerCard
              userDetails={userDetails}
              userId={postUserId}
              product={postContent}
              viewerIsPremium={viewerIsPremium}
              onChatClick={!isOwner ? handleChatWithSeller : undefined}
              onOfferClick={!isOwner ? () => setShowOfferModal(true) : undefined}
              chatLoading={chatLoading}
              showOfferButton={postContent.status !== 'sold'}
              hasOffer={!!existingOffer}
            />
          )}
          {!user && !isOwner && <p className="viewLoginToChat">Log in to chat with the seller.</p>}
          <ProductDescription
            description={description}
            showReadMore={showReadMore}
            expanded={descriptionExpanded}
            onToggle={() => setDescriptionExpanded(true)}
          />
          <PriceHistory productId={postContent.id} />
          {isOwner && (
            <>
              <AdAnalytics product={postContent} />
              <AdActions
                product={postContent}
                isOwner={isOwner}
                onSold={() => setPostContent({ ...postContent, status: 'sold', sold_at: new Date().toISOString() })}
                onFeaturedRequest={() =>
                  setPostContent({
                    ...postContent,
                    promotion_plan: 'requested',
                    bumped_at: new Date().toISOString(),
                  })
                }
              />
            </>
          )}
          <ShareButtons title={postContent.name} productId={postContent.id} />
          <SafetyTips />
          {!isOwner && user && (
            <button type="button" className="reportAdLink" onClick={() => setShowReportModal(true)}>Report this ad</button>
          )}
        </div>
      </div>
      <div className="viewSimilarSection">
        <SimilarAds category={postContent.category} excludeId={postContent.id} limit={8} />
      </div>
      <div className="viewReviewsSection" style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 24px' }}>
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Seller Reviews</h3>
        <ReviewList sellerId={postUserId} />
      </div>
      {showReportModal && <ReportAd productId={postContent.id} reporterId={userId} onClose={() => setShowReportModal(false)} />}
      {showOfferModal && <MakeOfferModal product={postContent} onClose={() => setShowOfferModal(false)} />}
    </div>
  );
}
