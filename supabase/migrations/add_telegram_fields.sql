-- Add telegram notification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.telegram_bot_token IS 'Telegram bot token for notifications';
COMMENT ON COLUMN public.profiles.telegram_chat_id IS 'Telegram chat ID for notifications';
