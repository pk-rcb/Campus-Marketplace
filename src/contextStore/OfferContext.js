import React, { createContext, useEffect, useMemo, useState } from 'react';
import { supabase } from 'backend/config';
import { AuthContext } from './AuthContext';

export const OfferContext = createContext(null);

function OfferProvider({ children }) {
  const { user } = React.useContext(AuthContext);
  const [sentOffers, setSentOffers] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);

  useEffect(() => {
    if (!user?.id && !user?.uid) {
      setSentOffers([]);
      setReceivedOffers([]);
      return;
    }

    const userId = user.id || user.uid;

    const mapOffer = (d) => ({
      id: d.id,
      productId: d.product_id,
      productName: d.product_name,
      productImage: d.product_image,
      sellerId: d.seller_id,
      buyerId: d.buyer_id,
      offerAmount: d.amount,
      originalPrice: d.original_price,
      counterAmount: d.counter_amount ?? null,
      message: d.message,
      paymentMethod: d.payment_method,
      deliveryPreference: d.delivery_preference,
      status: d.status,
      createdAt: d.created_at ? new Date(d.created_at).getTime() : 0,
    });

    const fetchOffers = async () => {
      const { data: sentData } = await supabase
        .from('offers')
        .select('*')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });
      
      if (sentData) setSentOffers(sentData.map(mapOffer));

      const { data: receivedData } = await supabase
        .from('offers')
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (receivedData) setReceivedOffers(receivedData.map(mapOffer));
    };

    fetchOffers();

    const channelSent = supabase
      .channel(`offers:buyer:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `buyer_id=eq.${userId}` }, fetchOffers)
      .subscribe();

    const channelReceived = supabase
      .channel(`offers:seller:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `seller_id=eq.${userId}` }, fetchOffers)
      .subscribe();

    return () => {
      supabase.removeChannel(channelSent);
      supabase.removeChannel(channelReceived);
    };
  }, [user?.id, user?.uid]);

  const value = useMemo(
    () => ({
      sentOffers,
      receivedOffers,
    }),
    [sentOffers, receivedOffers]
  );

  return (
    <OfferContext.Provider value={value}>{children}</OfferContext.Provider>
  );
}

export default OfferProvider;
