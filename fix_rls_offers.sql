-- ============================================================
-- Campus Marketplace — RLS Policies for Offers & Notifications
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Enable RLS on tables ──
ALTER TABLE public.offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ── Offers ──────────────────────────────────────────────────

-- Buyers can INSERT their own offers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Buyers can insert offers'
  ) THEN
    CREATE POLICY "Buyers can insert offers"
      ON public.offers FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = buyer_id);
  END IF;
END $$;

-- Both buyers and sellers can SELECT their own offers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Users can view their offers'
  ) THEN
    CREATE POLICY "Users can view their offers"
      ON public.offers FOR SELECT
      TO authenticated
      USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
  END IF;
END $$;

-- Sellers can UPDATE (accept / reject / counter) offers they received
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Sellers can update received offers'
  ) THEN
    CREATE POLICY "Sellers can update received offers"
      ON public.offers FOR UPDATE
      TO authenticated
      USING (auth.uid() = seller_id);
  END IF;
END $$;

-- ── Notifications ────────────────────────────────────────────

-- Authenticated users can INSERT notifications (needed for buyer→seller flow using anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Authenticated users can insert notifications'
  ) THEN
    CREATE POLICY "Authenticated users can insert notifications"
      ON public.notifications FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Users can SELECT their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications"
      ON public.notifications FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can UPDATE (mark read) their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON public.notifications FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
