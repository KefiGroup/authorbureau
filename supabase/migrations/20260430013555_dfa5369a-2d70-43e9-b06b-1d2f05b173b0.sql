ALTER TABLE public.author_nodes
  ADD CONSTRAINT author_nodes_author_node_unique UNIQUE (author_id, node_id);