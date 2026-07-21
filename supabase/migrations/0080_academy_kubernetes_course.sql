-- Kubernetes Fundamentals: Pods & Cluster Triage — the next real Academy
-- course after Linux/Networking/Docker, same real shape (modules, lessons
-- with a comprehension check, a real graded quiz). Business+ tier: it
-- assumes Docker & Container Fundamentals already, and is priced as the
-- next step up the same way that course sits above the free Linux course.

insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track) values
  ('kubernetes-fundamentals-pods-and-cluster-triage', 'Kubernetes Fundamentals: Pods & Cluster Triage', 'What a Pod and a Deployment actually are, how Services give them stable networking, and the kubectl workflow for diagnosing a broken deployment — CrashLoopBackOff, ImagePullBackOff, and the other failures you''ll actually hit running a cluster.', 'intermediate', 24, true, 105, 'devops', 'BUSINESS', false, 'academy')
on conflict (slug) do nothing;

do $$
declare
  v_course_id uuid;
  v_m1 uuid;
  v_m2 uuid;
begin
  select id into v_course_id from cybersachet_courses where slug = 'kubernetes-fundamentals-pods-and-cluster-triage';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Kubernetes Core Concepts', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Operating and Troubleshooting a Cluster', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'Pods, Deployments, and the Kubernetes API',
   E'A Pod is the smallest deployable unit in Kubernetes — one or more containers that share the same network namespace and storage, always scheduled together on the same node. You almost never create a bare Pod directly, because a Pod that dies stays dead: nothing brings it back. A Deployment describes the desired state instead — "I want 3 replicas of this container running" — and Kubernetes'' control loop continuously reconciles reality toward that desired state, recreating a Pod the moment it disappears. Under the hood, a Deployment manages a ReplicaSet, which manages the actual Pods; you edit the Deployment, and the ReplicaSet/Pod layers below it exist so a rolling update can spin up new Pods before tearing down old ones instead of causing an outage.',
   'A bare Pod that dies stays dead — a Deployment is what actually keeps the desired number of replicas running.', 0,
   'Why do you almost always use a Deployment instead of creating a Pod directly?', '["Pods are deprecated", "A Deployment automatically recreates a Pod that dies to maintain the desired replica count", "Deployments are required for networking to work at all", "There is no real difference"]'::jsonb, 1),
  (v_course_id, v_m1, 'Services and networking',
   E'Every Pod gets its own IP address, but that address is ephemeral — the moment a Pod is recreated (a redeploy, a crash, a node failure), it gets a new one. Nothing that depends on a stable address to reach your application, like other services or a load balancer, can track a Pod IP directly. A Service solves this: it''s a stable virtual IP and DNS name that load-balances traffic across every currently-running Pod matching a label selector, updating automatically as Pods come and go. ClusterIP (the default) is only reachable from inside the cluster — for internal service-to-service traffic. NodePort opens a port on every node for external access, mostly used for testing. LoadBalancer provisions an actual cloud load balancer (on a cloud provider that supports it) for real external traffic. Other Pods reach a Service by its DNS name (like `my-service.my-namespace.svc.cluster.local`) rather than any IP at all, which is what makes the whole system resilient to Pods being replaced constantly.',
   'A Service is a stable name/IP that load-balances across whichever Pods currently match its label selector — Pod IPs themselves are never something to depend on.', 1,
   'Why shouldn''t another service connect directly to a Pod''s IP address?', '["Pod IPs are always the same, so this is actually fine", "A Pod''s IP changes every time it''s recreated — a Service provides the stable address instead", "Pods don''t have IP addresses", "It is required for security reasons only"]'::jsonb, 1),
  (v_course_id, v_m2, 'kubectl essentials',
   E'`kubectl get pods` lists Pods and their status at a glance — Running (healthy), Pending (waiting to be scheduled, often on insufficient cluster resources), CrashLoopBackOff (the container keeps starting and immediately dying), and ImagePullBackOff (Kubernetes can''t pull the container image, usually a typo in the image name/tag or a private registry auth problem). `kubectl describe pod <name>` is the single most useful troubleshooting command — its Events section at the bottom shows exactly what Kubernetes tried and what failed, in order, which is almost always more informative than the status alone. `kubectl logs <pod>` shows what the application itself printed — add `--previous` to see the logs from the last crashed instance of a CrashLoopBackOff pod, since by the time you look, it may have already restarted with a fresh, empty log. `kubectl exec -it <pod> -- sh` opens a shell inside a running container, the same escape hatch `docker exec` is for a container.',
   '`kubectl describe pod` and its Events section is almost always more informative than the status column alone — that''s where the real failure reason shows up.', 0,
   'A crashed pod has already restarted, so `kubectl logs` shows nothing useful. What do you add to see the previous crash''s logs?', '["--all", "--previous", "--force", "--tail=0"]'::jsonb, 1),
  (v_course_id, v_m2, 'Triage: diagnosing a broken deployment',
   E'A repeatable sequence handles most real Kubernetes incidents. First, `kubectl get pods` to see which Pods are unhealthy and their status code (CrashLoopBackOff vs. ImagePullBackOff point to very different problems). Second, `kubectl describe pod <name>` for the Events section — this catches scheduling failures (insufficient CPU/memory on any node), failed readiness/liveness probes, and image pull errors immediately. Third, `kubectl logs <name>` (with `--previous` if it already restarted) to see what the application itself said before it died — a stack trace, a missing environment variable, a database connection refused. Common real causes: a typo''d image tag, a ConfigMap or Secret the Pod expects that doesn''t exist or was renamed, a liveness probe with too short a timeout killing a slow-starting app, or requesting more CPU/memory than any node has available. Once you''ve found and fixed the cause, `kubectl scale deployment <name> --replicas=N` adjusts capacity, and `kubectl rollout restart deployment <name>` forces fresh Pods to pick up a fixed ConfigMap/Secret without a new image.',
   'Work the same order every time: get pods for the symptom, describe pod for the Events section, logs (--previous if needed) for what the app itself said.', 1,
   'A pod shows ImagePullBackOff. What does that specifically point to?', '["The application crashed after starting", "Kubernetes could not pull the container image — often a typo''d tag or a registry auth problem", "The cluster is out of memory", "A readiness probe is failing"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'What is the relationship between a Deployment and a Pod?', '["They are the same thing with different names", "A Deployment manages a ReplicaSet, which manages Pods, maintaining the desired replica count", "A Pod manages a Deployment", "Deployments are only used for networking"]'::jsonb, 'single', 1, 0),
  (v_course_id, 'What problem does a Kubernetes Service solve?', '["It provides a stable name/address that load-balances across Pods, whose own IPs are ephemeral", "It replaces the need for Pods entirely", "It only matters for external traffic, never internal", "It stores application configuration"]'::jsonb, 'single', 0, 1),
  (v_course_id, 'A pod is stuck in CrashLoopBackOff. What is the most useful next command?', '["kubectl get nodes", "kubectl describe pod <name>, to read its Events section", "kubectl delete namespace", "kubectl top pod"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'What does `kubectl rollout restart deployment` accomplish that a fixed ConfigMap alone doesn''t?', '["It deletes the deployment", "It forces fresh Pods to start, which is what actually picks up the updated ConfigMap", "It changes the container image automatically", "It is identical to kubectl scale"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;
end $$;
