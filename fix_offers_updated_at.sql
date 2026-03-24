-- Fix for the 400 Bad Request error when accepting/rejecting offers:
-- The 'offers' table had a database trigger trying to set 'updated_at',
-- but the table was missing that column.

ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
