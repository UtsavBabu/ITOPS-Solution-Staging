-- Learning Paths: a lightweight grouping of existing, independent courses
-- into a real Beginner -> Intermediate -> Advanced progression, without
-- reshaping the course/module/lesson schema. A "Level" in the requested
-- Course > Level > Module > Lesson structure is implemented as its own
-- full course (so it keeps its own real plan-gating, enrollment,
-- progress, and certificate — nothing shared/fragile across levels),
-- and a learning_path just orders a set of courses together with a
-- level label, the same relationship Coursera's "Specializations" have
-- to their individual courses.

create table learning_paths (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  description text,
  track       text not null check (track in ('security', 'academy')),
  category    text,
  published   boolean not null default true,
  sort_order  int not null default 0
);
alter table learning_paths enable row level security;
create policy learning_paths_select on learning_paths for select to authenticated using (published);

create table learning_path_courses (
  path_id     uuid not null references learning_paths(id) on delete cascade,
  course_id   uuid not null references cybersachet_courses(id) on delete cascade,
  level_label text not null,
  sort_order  int not null default 0,
  primary key (path_id, course_id)
);
alter table learning_path_courses enable row level security;
create policy learning_path_courses_select on learning_path_courses for select to authenticated using (true);

-- Real per-user completion state per course in the path, so the UI can
-- show "done / current / not started" the same way module progress does
-- elsewhere — computed from the same cybersachet_enrollments every other
-- Academy view already reads, never a second source of truth.
create or replace function list_learning_paths()
returns table (
  id uuid, slug text, title text, description text, track text, category text,
  courses jsonb
)
language sql security definer stable set search_path = public, pg_temp as $$
  select
    lp.id, lp.slug, lp.title, lp.description, lp.track, lp.category,
    (
      select coalesce(jsonb_agg(jsonb_build_object(
        'courseId', c.id,
        'slug', c.slug,
        'title', c.title,
        'levelLabel', lpc.level_label,
        'sortOrder', lpc.sort_order,
        'minPlan', c.min_plan,
        'estimatedMinutes', c.estimated_minutes,
        'lessonCount', (select count(*) from cybersachet_lessons l where l.course_id = c.id),
        'completed', exists (
          select 1 from cybersachet_enrollments e
          where e.course_id = c.id and e.user_id = auth.uid() and e.completed_at is not null
        )
      ) order by lpc.sort_order), '[]'::jsonb)
      from learning_path_courses lpc
      join cybersachet_courses c on c.id = lpc.course_id and c.published
      where lpc.path_id = lp.id
    ) as courses
  from learning_paths lp
  where lp.published
  order by lp.sort_order;
$$;
grant execute on function list_learning_paths() to authenticated;

-- ---------------------------------------------------------------------------
-- DevOps & CI/CD Intermediate — the second real level of the DevOps path,
-- following the existing "Introduction to DevOps & CI/CD" (migration 0073).
-- Same 7-module depth as the Docker expansion (migration 0086): real
-- lessons, hands-on labs, per-module interview questions, and a capstone,
-- reusing the lab/interview_questions/capstone columns added there —
-- these are now general LMS content features, not Docker-specific.
-- ---------------------------------------------------------------------------

insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track, capstone) values
  ('devops-cicd-intermediate', 'DevOps & CI/CD: Intermediate', 'Real pipeline architecture, Jenkins and GitHub Actions in practice, Docker inside a pipeline, Terraform fundamentals, and the secrets/supply-chain risks and rollback strategies every production pipeline has to handle.', 'intermediate', 260, true, 107, 'devops', 'PROFESSIONAL', false, 'academy', '{
    "title": "Build a real CI/CD pipeline for a containerized application",
    "description": "Take an application through a real pipeline end to end — build, test, containerize, and produce a deployable, traceable artifact, with a rollback plan decided before you need it.",
    "requirements": [
      "Write a real GitHub Actions workflow (or Jenkinsfile) that runs on every push: checkout, install dependencies, run tests",
      "Add a stage that builds a Docker image and tags it with the git commit SHA, not latest",
      "Push the built image to a registry using a secret stored in the platform''s real secrets store, never hardcoded",
      "Pin any third-party actions/plugins used to a specific version or commit, not a floating branch",
      "Add a scan step (even a basic one) before the push step, so a vulnerable image fails the build",
      "Write a one-page rollback plan: which strategy (revert-and-redeploy, redeploy-previous-artifact, or feature flag) you''d use and why, for this specific app"
    ],
    "deliverable": "A working pipeline file (Actions workflow or Jenkinsfile) you can point to and explain stage by stage, plus your rollback plan. Self-assessed against the checklist above."
  }'::jsonb)
on conflict (slug) do nothing;

do $$
declare
  v_course_id uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid; v_m5 uuid; v_m6 uuid; v_m7 uuid;
begin
  select id into v_course_id from cybersachet_courses where slug = 'devops-cicd-intermediate';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then

  insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
    (v_course_id, 'CI/CD Pipeline Architecture', 0, '[
      {"question": "What does \"pipeline as code\" actually mean, and why does it matter?", "answer": "The pipeline definition itself lives in a file checked into the repository, versioned and reviewed the same way application code is — instead of being configured by clicking through a UI, which nobody reviews and which drifts silently between environments."},
      {"question": "Why do PR pipelines typically run a smaller set of checks than a merge-to-main pipeline?", "answer": "PR pipelines optimize for fast feedback so a developer isn''t blocked waiting — the full, slower suite (broader tests, deploy stages) runs on merge, where correctness matters more than speed."}
    ]'::jsonb) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
    (v_course_id, 'Jenkins in Practice', 1, '[
      {"question": "What is the practical difference between declarative and scripted Jenkins pipeline syntax?", "answer": "Declarative is structured and constrained (easier to read, review, and validate) — scripted is full Groovy, more flexible but harder to review and more error-prone. Most teams default to declarative and only reach for scripted for edge cases it can''t express."},
      {"question": "Why shouldn''t production builds run directly on the Jenkins controller?", "answer": "The controller runs Jenkins itself — a build with a runaway process or a compromised dependency can take down the entire Jenkins instance, not just its own job. Agents isolate build workloads from the system that schedules and manages them."}
    ]'::jsonb) returning id into v_m2;
  insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
    (v_course_id, 'GitHub Actions in Practice', 2, '[
      {"question": "By default, do jobs in a GitHub Actions workflow run in parallel or in sequence?", "answer": "Parallel, unless a job declares needs: on another job — steps within a single job run sequentially, but separate jobs run at the same time by default."},
      {"question": "When would you choose a self-hosted runner over a GitHub-hosted one?", "answer": "When the build needs access to a private network/internal resources, specific hardware (GPU, particular architecture), or persistent local caching that a fresh, ephemeral hosted runner can''t provide."}
    ]'::jsonb) returning id into v_m3;
  insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
    (v_course_id, 'Docker Integration in Pipelines', 3, '[
      {"question": "Why tag pipeline-built images with the git commit SHA?", "answer": "It lets you trace exactly which code produced any running container — tagging only latest throws that traceability away and can silently deploy different code than intended."},
      {"question": "What is a matrix build and when would you use one?", "answer": "Running the same job across multiple combinations (e.g. OS versions, architectures, language versions) in parallel — used when you need to verify or build for more than one target without writing near-duplicate pipeline definitions."}
    ]'::jsonb) returning id into v_m4;
  insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
    (v_course_id, 'Infrastructure as Code Fundamentals', 4, '[
      {"question": "What is the difference between terraform plan and terraform apply?", "answer": "plan previews what would change without touching real infrastructure at all; apply actually makes the change. The plan-before-apply discipline is Terraform''s core safety mechanism against surprise changes."},
      {"question": "Why is losing a Terraform state file dangerous?", "answer": "State maps your configuration to already-created real resources. Without it, Terraform no longer knows what it manages, risking orphaned resources it can no longer track or destructive drift the next time someone applies."}
    ]'::jsonb) returning id into v_m5;
  insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
    (v_course_id, 'Pipeline Security & Secrets Management', 5, '[
      {"question": "What is OIDC federation and why is it considered better than storing long-lived cloud credentials as CI secrets?", "answer": "OIDC lets the CI platform request short-lived, scoped credentials directly from the cloud provider at run time, instead of storing a static long-lived access key as a secret. A short-lived token that expires in minutes can''t be stolen and reused the way a static key sitting in secrets storage can."},
      {"question": "What is dependency confusion, in the context of a build pipeline?", "answer": "An attacker publishes a public package with the same name as an internal private one; if the build is misconfigured to check public registries first, it silently pulls the attacker''s malicious package instead of the real internal one."}
    ]'::jsonb) returning id into v_m6;
  insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
    (v_course_id, 'Monitoring, Troubleshooting & Rollbacks', 6, '[
      {"question": "How do you tell a flaky test from a real regression in a failed pipeline run?", "answer": "A flaky test fails intermittently and often passes on re-run with no code change (usually infra/timing related); a real regression fails deterministically because of an actual code change. Re-running a failure without checking which one it is risks masking a real bug."},
      {"question": "What are the three main rollback strategies, and how do you choose between them?", "answer": "Revert-and-redeploy (safest, slowest — git revert then rerun the pipeline), redeploy-previous-artifact (fast, requires retained immutable build artifacts), and feature flags (fastest, but only works if the flag was built in ahead of time). The right choice depends on how the original change was shipped, decided before an incident, not during one."}
    ]'::jsonb) returning id into v_m7;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'Anatomy of a real pipeline',
   E'A real pipeline is a sequence of stages: checkout, build, test, scan, package, deploy — each one a gate the change has to pass before the next runs. "Pipeline as code" means this sequence is defined in a file (a Jenkinsfile, a GitHub Actions workflow, a GitLab CI YAML) that lives in the repository itself, versioned and reviewed the same way application code is, instead of clicked together in a UI that nobody reviews and that quietly drifts between environments. This is also why a change to the pipeline definition goes through the same pull-request review as any other code change — the deployment process is a first-class, auditable part of the codebase, not a separate, informal thing someone remembers how to configure.',
   'Pipeline-as-code means the deployment process itself is versioned and reviewed like any other code change — not configured by hand in a UI nobody reviews.', 0,
   'What does "pipeline as code" mean?', '["The pipeline only runs application code, nothing else", "The pipeline definition lives in a file in the repo, versioned and reviewed like any other code", "Pipelines are written exclusively in a general-purpose programming language", "It refers to auto-generating code from the pipeline"]'::jsonb, 1),
  (v_course_id, v_m1, 'Triggers and pipeline design',
   E'Different events should trigger different pipelines. A pull request typically runs a fast subset of checks — lint, unit tests, maybe a build — optimized for quick feedback so a developer isn''t blocked waiting. A merge to the main branch runs the full suite: broader integration tests, security scans, and the actual deploy stages, since correctness now matters more than speed. Well-designed pipelines also use fan-out/fan-in: several independent test suites run in parallel (fan-out) and the deploy stage only starts once all of them report success (fan-in) — this cuts total pipeline time dramatically compared to running everything sequentially, without sacrificing the requirement that everything actually passes before deploying.',
   'Match trigger to purpose — PR pipelines optimize for fast feedback, merge pipelines optimize for correctness before deploy.', 1,
   'Why do PR pipelines typically run fewer checks than a merge-to-main pipeline?', '["PRs are less important than merges", "PR pipelines optimize for fast feedback; the full suite runs on merge where correctness matters more", "GitHub limits how many checks a PR can run", "There is no real difference"]'::jsonb, 1),

  (v_course_id, v_m2, 'The Jenkinsfile and pipeline syntax',
   E'A Jenkinsfile can be written in declarative syntax (a structured, constrained format — stages, steps, an agent directive for where it runs, and a post block for cleanup/notifications that run regardless of outcome) or scripted syntax (full Groovy, far more flexible but harder to read and review). Declarative is the default choice for most teams precisely because its structure is easier to validate and reason about; scripted is reserved for logic declarative genuinely can''t express. The agent directive matters more than it looks — it decides which machine actually executes the stage, which is the foundation of build isolation covered in the next lesson.',
   'Declarative Jenkins syntax trades some flexibility for structure that''s easier to read, review, and validate — reach for scripted only when declarative genuinely can''t express what you need.', 0,
   'What is the practical tradeoff between declarative and scripted Jenkins pipelines?', '["Scripted is always faster to execute", "Declarative is more structured and easier to review; scripted is more flexible but harder to read", "Declarative can only run on Linux agents", "There is no real difference between them"]'::jsonb, 1),
  (v_course_id, v_m2, 'Jenkins agents, executors, and plugins',
   E'The Jenkins controller schedules and manages jobs; agents are the machines that actually execute a build''s steps. Running production builds directly on the controller is a real anti-pattern — a runaway process or a compromised dependency in a build can take down the entire Jenkins instance, not just its own job, since the controller also runs everything else. Executors set how many builds an agent can run in parallel — too few and jobs queue up waiting; too many and builds start starving each other for CPU/memory on the same box. Jenkins'' plugin ecosystem is a double edge: it covers almost any integration you''d want, but every installed plugin is also code you''re trusting and a real maintenance/security surface — auditing and removing unused plugins periodically is a genuine, not optional, part of running Jenkins.',
   'Never run production builds on the Jenkins controller itself — a compromised or runaway build should only be able to take down an agent, not the whole instance.', 1,
   'Why shouldn''t production builds run directly on the Jenkins controller?', '["It''s slower than an agent", "A bad build could take down the entire Jenkins instance, not just its own job", "Controllers can''t run Groovy scripts", "There is no real difference"]'::jsonb, 1),

  (v_course_id, v_m3, 'Workflow YAML: jobs, steps, and runners',
   E'A GitHub Actions workflow lives in .github/workflows/*.yml. Jobs run in parallel by default — add needs: another-job to force one to wait for another to finish first. Steps within a single job run sequentially, top to bottom. A runner is the machine executing the job: GitHub-hosted runners are fresh, ephemeral virtual machines spun up per run (no leftover state between runs, no maintenance burden, but no access to your private network); self-hosted runners are your own persistent infrastructure, needed when a build requires internal network access, specific hardware, or heavier local caching a fresh hosted runner can''t provide.',
   'GitHub-hosted runners are fresh and maintenance-free but isolated from your network — self-hosted runners trade that isolation for persistent access and caching.', 0,
   'By default, do jobs in a GitHub Actions workflow run in parallel or sequentially?', '["Sequentially, always", "Parallel by default, unless a job declares needs on another job", "It depends on the runner OS", "Only one job can exist per workflow"]'::jsonb, 1),
  (v_course_id, v_m3, 'Reusable workflows, composite actions, and secrets',
   E'Copy-pasting the same steps across many workflow files is exactly the kind of duplication CI/CD is supposed to eliminate elsewhere. Reusable workflows (called with workflow_call) and composite actions solve this by letting one definition be called from many workflows, with inputs for whatever varies between callers. secrets.* values are automatically masked in logs — they show up as *** even if a step accidentally prints them — but that masking only protects the log output; anyone who can edit the workflow file itself can still reference and potentially exfiltrate a secret in a new step. This is why write access to .github/workflows deserves the same scrutiny as write access to production infrastructure — it effectively is.',
   'Secret masking protects log output, not the secret itself — anyone who can edit the workflow file can still reference it, so treat that write access like production access.', 1,
   'What actually protects a workflow secret from being exposed?', '["Masking in logs alone is fully sufficient", "Masking hides it from logs, but anyone who can edit the workflow file can still reference and potentially exfiltrate it", "Secrets are encrypted so no one can ever use them", "GitHub deletes secrets after each run"]'::jsonb, 1),

  (v_course_id, v_m4, 'Building and tagging images in CI',
   E'Building a Docker image inside a pipeline is the same docker build under the hood, just run by a CI job instead of a laptop — with two things that matter more at CI scale. First, layer caching: without it, every run rebuilds every layer from scratch; BuildKit cache mounts (or a registry-based cache) let a pipeline reuse unchanged layers between runs, the same speedup covered in the Docker course''s Dockerfile-ordering lesson, just wired into CI instead of a local machine. Second, tagging: tag every CI-built image with the git commit SHA (never just latest), so any running container can be traced back to the exact code that produced it — the same discipline covered in the Docker course''s registries lesson, now the pipeline''s job to enforce automatically instead of a person remembering to do it. Matrix builds run the same build across multiple targets (OS, architecture) in parallel when more than one is genuinely needed.',
   'Tag every CI-built image with the git commit SHA, not latest — it''s the difference between tracing a production incident back to exact code and not being able to.', 0,
   'Why tag CI-built Docker images with the git commit SHA?', '["It makes the build faster", "It lets you trace exactly which code produced any running container", "It''s required by all registries", "It reduces the image size"]'::jsonb, 1),

  (v_course_id, v_m5, 'Terraform basics: providers, resources, and state',
   E'Terraform describes infrastructure in HCL: a provider block (aws, azurerm, google) tells it which API to talk to, and resource blocks describe the actual things you want to exist — a VM, a storage bucket, a network. terraform plan previews exactly what would change without touching any real infrastructure at all; terraform apply actually makes the change. This plan-before-apply discipline is Terraform''s core safety mechanism — you see precisely what will be created, changed, or destroyed before it happens, catching a typo''d resource or an accidental destroy before it becomes a real incident instead of after.',
   'Always read the plan output before applying — it''s the one guaranteed chance to catch a mistake before it touches real infrastructure.', 0,
   'What is the core safety mechanism terraform plan provides?', '["It automatically fixes configuration errors", "It previews exactly what would change before anything real is touched", "It encrypts the state file", "It replaces the need for version control"]'::jsonb, 1),
  (v_course_id, v_m5, 'Terraform state and why it''s dangerous to lose',
   E'Terraform''s state file maps your configuration to the real, already-created resources it manages — it''s how Terraform knows an aws_instance block in your code corresponds to a specific, already-running server rather than one it should create fresh. Losing or corrupting that file means Terraform no longer knows what it''s actually managing: it might try to recreate resources that already exist, or lose track of ones it should be managing entirely. Remote state (an S3 bucket with DynamoDB locking, or Terraform Cloud) solves two problems at once: the file survives even if a laptop dies, and locking prevents two people from applying at the same time and corrupting it through a race condition. The state file can also contain sensitive values (resource IDs, sometimes secrets) — it should never be committed to git.',
   'Remote state with locking solves both loss risk (survives a laptop dying) and team-concurrency risk (prevents two simultaneous applies from corrupting it).', 1,
   'Why is a Terraform state file dangerous to lose?', '["It only affects billing reports", "Terraform no longer knows what real resources it manages, risking orphaned resources or destructive drift", "It just needs to be regenerated with one command, no real risk", "State files are automatically backed up by every provider"]'::jsonb, 1),

  (v_course_id, v_m6, 'Secrets in CI, done right',
   E'A secret hardcoded in a pipeline file is not private, even in a "private" repository — it can leak through build logs, forks, or anyone with read access to the repo''s history. The real fix is the platform''s actual secrets store (GitHub Secrets, Jenkins Credentials), never a plain environment variable checked into the pipeline file itself. The modern best practice goes further: OIDC federation lets the CI platform request short-lived, scoped credentials directly from the cloud provider (AWS, Azure, GCP) at run time, instead of storing a long-lived access key as a secret at all. A short-lived token that expires in minutes is far less dangerous if leaked than a static key sitting in secrets storage indefinitely, waiting to be stolen and reused later.',
   'OIDC federation''s real advantage is that a stolen short-lived token expires in minutes — a stolen long-lived static key doesn''t.', 0,
   'What is the main advantage of OIDC federation over storing a long-lived cloud access key as a CI secret?', '["It''s easier to configure", "A short-lived token requested at run time can''t be stolen and reused the way a static long-lived key can", "It removes the need for any authentication at all", "It only works with GitHub Actions"]'::jsonb, 1),
  (v_course_id, v_m6, 'Supply-chain risk in pipelines',
   E'Using a third-party action or plugin pinned to a floating reference (uses: someaction@main instead of a specific version tag or commit SHA) means the code that actually runs inside your pipeline can change without your review — if that action is compromised upstream, the next run silently executes the attacker''s code with whatever access your pipeline has. Pinning to an exact commit SHA (or at minimum a specific released version) means an update to that dependency is something you have to deliberately pull in, not something that happens to you automatically. Dependency confusion is a related but distinct risk: an attacker publishes a public package with the same name as an internal private one, and if the build resolves public registries before internal ones, it silently pulls the attacker''s malicious package instead of the real internal dependency.',
   'Pin third-party actions and plugins to an exact version or commit — a floating reference means their code can change without your review.', 1,
   'Why pin a third-party GitHub Action to a specific commit SHA instead of @main?', '["It makes the workflow run faster", "@main can change at any time without your review — pinning means an update is something you deliberately pull in", "SHA pinning is required by GitHub", "It has no real security benefit"]'::jsonb, 1),

  (v_course_id, v_m7, 'Debugging a failed pipeline run, systematically',
   E'Read the actual failing step''s log output first — not just the red X, the real error a few lines up from where the job gave up. Reproduce the failure locally when possible before iterating inside CI; a local reproduction loop is minutes, a CI iteration loop is often much slower per attempt. The most important early judgment call is distinguishing a flaky test (intermittent, often infra or timing related, frequently passes on a re-run with zero code changes) from a real regression (deterministic, caused by an actual code change, will keep failing until it''s fixed) — re-running a failure without knowing which one it is risks either wasting time chasing a phantom or, worse, masking a real bug by assuming it was "just flaky."',
   'Work out whether a failure is flaky or a real regression before deciding to just re-run it — re-running blindly risks masking a genuine bug.', 0,
   'A pipeline step fails. What should you check first?', '["Immediately re-run the whole pipeline", "Read the actual failing step''s log output for the real error", "Restart the CI server", "Disable the failing test permanently"]'::jsonb, 1),
  (v_course_id, v_m7, 'Rollback strategies',
   E'Revert-and-redeploy (git revert the change, then run the pipeline again) is the safest option and the slowest, since it goes through the full pipeline again. Redeploy-previous-artifact (re-deploy the last known-good build output directly) is much faster, but only works if build artifacts are actually retained and immutable — if the previous artifact was deleted or overwritten, this option doesn''t exist when you need it. Feature flags — turning off the new behavior at runtime without a deploy at all — are the fastest of all three, but only work if the flag was built into the code ahead of time; you can''t retrofit a flag during an active incident. The right strategy depends entirely on how the original change was shipped, which is a decision to make before an incident, not during one.',
   'Feature flags are the fastest rollback, but only if built in ahead of time — you cannot retrofit one during an active incident.', 1,
   'Which rollback strategy requires the capability to have been built in ahead of time, before any incident?', '["Revert-and-redeploy", "Redeploy-previous-artifact", "Feature flags", "All three require no advance preparation"]'::jsonb, 1)
  on conflict do nothing;

  update cybersachet_lessons set lab = '{
    "objective": "Get a real declarative Jenkins pipeline running end to end.",
    "environment": "A local or existing Jenkins instance",
    "tools": ["Jenkins", "A small sample repository"],
    "steps": [
      "Create a Jenkinsfile with pipeline { agent any; stages { stage(''Build''){ steps { echo ''Building'' } } stage(''Test''){ steps { echo ''Testing'' } } } }",
      "Create a new Pipeline job in Jenkins pointing at this Jenkinsfile",
      "Run the build and watch the stage view populate as each stage completes",
      "Add a post { always { echo ''Done'' } } block and confirm it runs even if you make a stage fail on purpose"
    ],
    "troubleshooting": "Job stuck in queue → no agent is available/connected; check the agent''s status. Stage silently skipped → check for a missing when condition unintentionally excluding it.",
    "challenge": "Add a stage that only runs when the branch is main, using a when { branch ''main'' } condition."
  }'::jsonb where course_id = v_course_id and title = 'The Jenkinsfile and pipeline syntax';

  update cybersachet_lessons set lab = '{
    "objective": "Write and run a real GitHub Actions workflow that builds and tests a small app on every push.",
    "environment": "A GitHub repository you can push to",
    "tools": ["GitHub Actions"],
    "steps": [
      "Create .github/workflows/ci.yml with: on: push, a job with steps for actions/checkout, setting up a runtime, and running your test command",
      "Push a commit and watch the workflow run in the Actions tab",
      "Intentionally break a test, push again, and confirm the workflow fails clearly",
      "Fix it and confirm the workflow goes green again"
    ],
    "troubleshooting": "Workflow doesn''t trigger at all → check the on: block and that the file is really under .github/workflows/. Step fails with a missing command → confirm the runtime/setup step actually matches your project (e.g. setup-node for a Node project).",
    "challenge": "Add needs: to a second job so it only runs after the first job succeeds."
  }'::jsonb where course_id = v_course_id and title = 'Workflow YAML: jobs, steps, and runners';

  update cybersachet_lessons set lab = '{
    "objective": "Build and tag a Docker image as part of a CI workflow, the way a real pipeline would.",
    "environment": "A GitHub repository with a Dockerfile",
    "tools": ["GitHub Actions", "Docker"],
    "steps": [
      "Add a step using docker/build-push-action (or a raw docker build command) to your workflow",
      "Tag the image with ${{ github.sha }} instead of latest",
      "Run the workflow and confirm the built image tag matches the commit that triggered it",
      "(Optional) Push to a registry you control, using a real secret for credentials"
    ],
    "troubleshooting": "Build succeeds locally but fails in CI → check for missing build context files not committed to the repo, or a Dockerfile assuming local files that only exist on your machine.",
    "challenge": "Add a second tag alongside the SHA tag — e.g. a branch name — so the image is reachable both ways."
  }'::jsonb where course_id = v_course_id and title = 'Building and tagging images in CI';

  update cybersachet_lessons set lab = '{
    "objective": "Apply a small, real Terraform configuration and inspect what state actually looks like.",
    "environment": "Terraform CLI installed, any provider account (or a local-only provider like ''local'' for a filesystem resource)",
    "tools": ["Terraform CLI"],
    "steps": [
      "Write a minimal main.tf with a provider block and one simple resource",
      "Run terraform init, then terraform plan and read the output carefully",
      "Run terraform apply and confirm the resource was actually created",
      "Open terraform.tfstate in a text editor and find the resource you just created inside it",
      "Run terraform destroy to clean up"
    ],
    "troubleshooting": "plan shows resources you didn''t expect to change → something already exists outside Terraform''s knowledge (manual change, or state drift) — this is exactly why state matters.",
    "challenge": "Explain, in your own words, why terraform.tfstate should never be committed to a public git repository."
  }'::jsonb where course_id = v_course_id and title = 'Terraform state and why it''s dangerous to lose';

  update cybersachet_lessons set lab = '{
    "objective": "Practice diagnosing a real failed pipeline run using the log output rather than guessing.",
    "environment": "Any CI system (GitHub Actions or Jenkins) with a sample project",
    "tools": ["GitHub Actions or Jenkins"],
    "steps": [
      "Deliberately break a test or a build step in a sample project",
      "Push/run the pipeline and let it fail",
      "Open the failing step''s full log, not just the summary, and find the real underlying error",
      "Fix the actual cause and confirm the pipeline passes"
    ],
    "troubleshooting": "The summary view hides the real error → most CI systems collapse long output by default; expand the failing step fully rather than trusting the one-line summary.",
    "challenge": "Re-run the same failing pipeline twice without changing anything. If it fails identically both times, explain why that rules out ''flaky.''"
  }'::jsonb where course_id = v_course_id and title = 'Debugging a failed pipeline run, systematically';

  if not exists (select 1 from cybersachet_quiz_questions where course_id = v_course_id) then
  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, correct_indexes, correct_order, sort_order) values
  (v_course_id, 'What does "pipeline as code" mean?', '["Pipelines can only build code, nothing else", "The pipeline definition lives in a file in the repo, versioned and reviewed like any other code", "Pipelines are written in a general-purpose language exclusively", "It means auto-generating application code"]'::jsonb, 'single', 1, null, null, 0),
  (v_course_id, 'What is the practical tradeoff between declarative and scripted Jenkins pipelines?', '["Scripted always runs faster", "Declarative is more structured and easier to review; scripted is more flexible but harder to read", "Declarative only supports Linux agents", "There is no real difference"]'::jsonb, 'single', 1, null, null, 1),
  (v_course_id, 'By default, how do jobs in a GitHub Actions workflow run relative to each other?', '["Always sequentially", "In parallel, unless a job declares needs on another job", "Only one job is allowed per workflow", "It depends on the repository size"]'::jsonb, 'single', 1, null, null, 2),
  (v_course_id, 'Why tag CI-built Docker images with the git commit SHA?', '["It makes builds run faster", "It lets you trace exactly which code produced any running container", "It is required by every registry", "It shrinks the image size"]'::jsonb, 'single', 1, null, null, 3),
  (v_course_id, 'What does terraform plan actually do?', '["Applies the change immediately", "Previews exactly what would change without touching real infrastructure", "Deletes the state file", "Only works after apply has already run"]'::jsonb, 'single', 1, null, null, 4),
  (v_course_id, 'Why is losing a Terraform state file dangerous?', '["It only affects cost reports", "Terraform no longer knows what real resources it manages, risking orphaned resources or destructive drift", "It regenerates automatically with no risk", "State is only used for local testing"]'::jsonb, 'single', 1, null, null, 5),
  (v_course_id, 'What is the main advantage of OIDC federation over a long-lived cloud access key stored as a CI secret?', '["Easier setup only", "A short-lived token requested at run time can''t be stolen and reused the way a static key can", "It removes the need for any authentication", "It only works with one cloud provider"]'::jsonb, 'single', 1, null, null, 6),
  (v_course_id, 'Why pin a third-party CI action to a specific commit SHA instead of a floating branch reference?', '["It makes the pipeline run faster", "A floating reference can change at any time without your review", "SHA pinning is mandated by GitHub", "It has no real security benefit"]'::jsonb, 'single', 1, null, null, 7),
  (v_course_id, 'Select every real pipeline security best practice (choose all that apply):', '["Store secrets in the platform''s real secrets store, never hardcoded", "Pin third-party actions/plugins to a specific version or commit", "Scan built images for known vulnerabilities before pushing", "Grant the pipeline''s service account broad admin access for convenience"]'::jsonb, 'multiple', null, array[0,1,2], null, 8),
  (v_course_id, 'Arrange the correct troubleshooting order for a failed pipeline run:', '["Fix the real underlying cause", "Read the failing step''s full log output", "Determine if it is flaky or a real regression", "Notice the pipeline failed"]'::jsonb, 'ordering', null, null, array[3,1,2,0], 9)
  on conflict do nothing;
  end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- The DevOps & CI/CD Engineer Path — links the existing Introduction course
-- (migration 0073) to this new Intermediate course. Only two real levels
-- exist today; a future "DevOps & CI/CD: Advanced" course (production
-- pipeline architecture at scale, GitOps, multi-environment promotion) is
-- the natural next addition to this same path, not fabricated here as a
-- locked placeholder.
-- ---------------------------------------------------------------------------

do $$
declare
  v_path_id uuid;
  v_intro_id uuid;
  v_intermediate_id uuid;
begin
  select id into v_intro_id from cybersachet_courses where slug = 'intro-to-devops-and-cicd';
  select id into v_intermediate_id from cybersachet_courses where slug = 'devops-cicd-intermediate';

  insert into learning_paths (slug, title, description, track, category, sort_order) values
    ('devops-cicd-engineer', 'DevOps & CI/CD Engineer Path', 'From why DevOps exists through real pipeline architecture, Jenkins, GitHub Actions, Docker-in-CI, Terraform, and production rollback strategy — the progression to work as a DevOps engineer, not just pass a quiz.', 'academy', 'devops', 0)
  on conflict (slug) do nothing;

  select id into v_path_id from learning_paths where slug = 'devops-cicd-engineer';

  insert into learning_path_courses (path_id, course_id, level_label, sort_order) values
    (v_path_id, v_intro_id, 'Introduction', 0),
    (v_path_id, v_intermediate_id, 'Intermediate', 1)
  on conflict (path_id, course_id) do nothing;
end $$;
