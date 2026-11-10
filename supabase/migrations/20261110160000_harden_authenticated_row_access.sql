DROP POLICY IF EXISTS "Leitura profiles para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Leitura requests para autenticados" ON public.creative_requests;
DROP POLICY IF EXISTS "Leitura versions para autenticados" ON public.request_versions;
DROP POLICY IF EXISTS "Leitura comments para autenticados" ON public.request_comments;
DROP POLICY IF EXISTS "Leitura approvals para autenticados" ON public.request_approvals;
DROP POLICY IF EXISTS "Atualizar solicitações para equipe criativa ou autor"
  ON public.creative_requests;

CREATE POLICY "Leitura próprio perfil"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Leitura próprias solicitações ou equipe"
  ON public.creative_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('designer', 'art_director', 'creative_manager', 'admin')
    )
  );

CREATE POLICY "Leitura versões autorizadas"
  ON public.request_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creative_requests cr
      WHERE cr.id = request_id
        AND (
          cr.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('designer', 'art_director', 'creative_manager', 'admin')
          )
        )
    )
  );

CREATE POLICY "Leitura comentários autorizados"
  ON public.request_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creative_requests cr
      WHERE cr.id = request_id
        AND (
          cr.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('designer', 'art_director', 'creative_manager', 'admin')
          )
        )
    )
  );

CREATE POLICY "Leitura aprovações autorizadas"
  ON public.request_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creative_requests cr
      WHERE cr.id = request_id
        AND (
          cr.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('designer', 'art_director', 'creative_manager', 'admin')
          )
        )
    )
  );

CREATE POLICY "Atualizar próprias solicitações ou equipe"
  ON public.creative_requests
  FOR UPDATE TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('designer', 'art_director', 'creative_manager', 'admin')
    )
  )
  WITH CHECK (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('designer', 'art_director', 'creative_manager', 'admin')
    )
  );
