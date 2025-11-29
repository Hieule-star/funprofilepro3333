-- Add parent_comment_id column to support nested comments
ALTER TABLE public.comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for better query performance on nested comments
CREATE INDEX idx_comments_parent_comment_id ON public.comments(parent_comment_id);

-- Add comment to explain the column
COMMENT ON COLUMN public.comments.parent_comment_id IS 'References the parent comment if this is a reply, null for top-level comments';