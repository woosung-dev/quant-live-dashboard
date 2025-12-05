-- Run this in your Supabase SQL Editor to update the table
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS code text;
