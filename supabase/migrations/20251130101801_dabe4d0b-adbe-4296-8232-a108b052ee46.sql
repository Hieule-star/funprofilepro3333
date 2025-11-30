-- Set REPLICA IDENTITY FULL for messages table to ensure realtime events contain complete row data
ALTER TABLE public.messages REPLICA IDENTITY FULL;