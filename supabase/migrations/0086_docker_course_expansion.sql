-- Expand Docker & Container Fundamentals from a 4-lesson overview into a
-- full ~5-hour program: 7 modules, 16 lessons, 6 structured hands-on labs,
-- per-module interview questions, a capstone project, and a broader final
-- assessment. Same real-content discipline as every other course this
-- session — every lab is a real, runnable exercise against a learner's own
-- Docker installation (never a claim of live-provisioned infrastructure),
-- and every interview question/answer is technically accurate, not filler.
--
-- Schema additions are all nullable/additive — existing courses/modules/
-- lessons with no lab, no interview questions, and no capstone are
-- completely unaffected.

alter table cybersachet_lessons add column if not exists lab jsonb;
alter table cybersachet_modules add column if not exists interview_questions jsonb;
alter table cybersachet_courses add column if not exists capstone jsonb;

-- ---------------------------------------------------------------------------
-- Read RPCs: Postgres can't change a function's return shape via CREATE OR
-- REPLACE, so each is dropped first (same discipline as migration 0084) —
-- only the RETURNS TABLE grows, arguments are unchanged, so every existing
-- caller keeps working with the new columns simply appearing.
-- ---------------------------------------------------------------------------

drop function if exists list_course_modules(uuid);
create or replace function list_course_modules(p_course_id uuid)
returns table (id uuid, title text, sort_order int, interview_questions jsonb)
language sql security definer stable set search_path = public, pg_temp as $$
  select m.id, m.title, m.sort_order, m.interview_questions
  from cybersachet_modules m
  join cybersachet_courses c on c.id = m.course_id
  where m.course_id = p_course_id and c.published
    and my_cybersachet_license() and _cybersachet_course_allowed(c.id)
  order by m.sort_order;
$$;
grant execute on function list_course_modules(uuid) to authenticated;

drop function if exists list_course_lessons(uuid);
create or replace function list_course_lessons(p_course_id uuid)
returns table (id uuid, title text, body text, sort_order int, module_id uuid, key_takeaway text, check_question text, check_choices jsonb, lab jsonb)
language sql security definer stable set search_path = public, pg_temp as $$
  select l.id, l.title, l.body, l.sort_order, l.module_id, l.key_takeaway, l.check_question, l.check_choices, l.lab
  from cybersachet_lessons l
  join cybersachet_courses c on c.id = l.course_id
  where l.course_id = p_course_id and c.published
    and my_cybersachet_license() and _cybersachet_course_allowed(c.id)
  order by l.sort_order;
$$;
grant execute on function list_course_lessons(uuid) to authenticated;

drop function if exists list_cybersachet_courses();
create or replace function list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, sort_order int, category text, free_tier boolean, min_plan text, track text,
  lesson_count bigint, quiz_question_count bigint, capstone jsonb
)
language sql security definer stable set search_path = public, pg_temp as $$
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.sort_order, c.category, c.free_tier, c.min_plan, c.track,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id),
    c.capstone
  from cybersachet_courses c
  where c.published
  order by c.sort_order;
$$;
grant execute on function list_cybersachet_courses() to authenticated;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

do $$
declare
  v_course_id uuid;
  v_m1 uuid; -- Why Containers (existing)
  v_m2 uuid; -- Working With Docker Day to Day (existing)
  v_m3 uuid; -- Docker Installation & Setup (new)
  v_m4 uuid; -- Real-World Docker Administration (new)
  v_m5 uuid; -- Docker Security & Best Practices (new)
  v_m6 uuid; -- Monitoring & Troubleshooting (new)
  v_m7 uuid; -- Docker in Production & CI/CD (new)
begin
  select id into v_course_id from cybersachet_courses where slug = 'docker-and-container-fundamentals';
  select id into v_m1 from cybersachet_modules where course_id = v_course_id and title = 'Why Containers';
  select id into v_m2 from cybersachet_modules where course_id = v_course_id and title = 'Working With Docker Day to Day';

  update cybersachet_courses set
    estimated_minutes = 300,
    level = 'intermediate',
    capstone = '{
      "title": "Deploy a production-style containerized web application",
      "description": "Build, secure, and run a real multi-container application end to end, using everything from this course — the same shape as a real small production deployment, not a toy example.",
      "requirements": [
        "Write a Dockerfile for a real application (any simple Node.js, Python, or static site app) using a multi-stage build",
        "Run the container as a non-root user (USER instruction)",
        "Write a docker-compose.yml with your app plus a database service, connected on a shared network",
        "Use a named volume so the database''s data survives a docker compose down / up",
        "Configure all secrets (DB password, API keys) via environment variables or mounted files — never baked into the image",
        "Add a HEALTHCHECK to your app''s Dockerfile",
        "Tag and push your image to a registry using an explicit version tag, not latest",
        "Write a one-page runbook: how to deploy this stack, and how to roll it back if the new version fails"
      ],
      "deliverable": "A working docker-compose stack you can demonstrate running locally, plus your Dockerfile, compose file, and runbook. This is self-assessed against the checklist above — the goal is real hands-on experience shipping something production-shaped, not an automated grade."
    }'::jsonb
  where id = v_course_id;

  update cybersachet_modules set interview_questions = '[
    {"question": "What specific problem do containers solve that virtual machines don''t already solve?", "answer": "VMs solve isolation but at the cost of a full OS per instance — heavy, slow to boot. Containers solve environment consistency (dependencies packaged with the app) while staying lightweight by sharing the host kernel. The real win is that the same image runs identically everywhere, not that it''s \"more isolated\" than a VM."},
    {"question": "Why did Docker succeed where earlier container technology like LXC didn''t reach the same adoption?", "answer": "The isolation technology (namespaces, cgroups) already existed. Docker''s win was UX: a simple CLI, a portable image format, and a public registry (Docker Hub) that made packaging and sharing containers accessible to any developer, not just kernel specialists."},
    {"question": "What is the OCI and why does it matter to someone using Kubernetes?", "answer": "The Open Container Initiative standardized the container image and runtime spec so images aren''t locked to Docker''s tooling. It''s why Kubernetes can run containers via containerd directly without Docker installed on nodes at all."}
  ]'::jsonb where id = v_m1;

  update cybersachet_modules set interview_questions = '[
    {"question": "Why is pinning to :latest risky in a production deployment?", "answer": "The tag silently points to whatever was pushed most recently, so a redeploy today can pull different image contents than a redeploy last week with no code change on your end. Production should pin to an explicit, immutable tag."},
    {"question": "What''s the difference between a named volume and a bind mount?", "answer": "A named volume is managed entirely by Docker and lives in Docker''s own storage area — portable and the right choice for things like database data. A bind mount points at a specific path on the host filesystem, useful for local development when you want the container to see your live source files."}
  ]'::jsonb where id = v_m2;

  if not exists (select 1 from cybersachet_modules where course_id = v_course_id and title = 'Docker Installation & Setup') then
    insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
      (v_course_id, 'Docker Installation & Setup', 2, '[
        {"question": "On Windows or Mac, are you really running \"Linux containers\"?", "answer": "Yes — Docker Desktop runs a lightweight Linux VM under the hood on both platforms and routes your containers into it, since neither OS kernel natively supports Linux namespaces/cgroups."},
        {"question": "What''s the difference between docker run -d and just docker run?", "answer": "Without -d, the container runs attached — your terminal blocks and streams its output. With -d it runs detached in the background, and you get your terminal back immediately."},
        {"question": "Why would you use --rm during testing?", "answer": "It automatically deletes the container as soon as it exits, preventing a pile-up of dead \"Exited\" containers from repeated test runs that you''d otherwise have to clean up manually."}
      ]'::jsonb) returning id into v_m3;
    insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
      (v_course_id, 'Real-World Docker Administration', 3, '[
        {"question": "What''s the difference between the \"always\" and \"unless-stopped\" restart policies?", "answer": "\"always\" restarts the container even after you manually stop it, if the daemon/host restarts. \"unless-stopped\" behaves the same except it respects an explicit manual stop across a daemon/host restart — it won''t come back if you deliberately stopped it."},
        {"question": "Why isn''t a bare \"is the process running\" check enough to know a container is healthy?", "answer": "A process can be alive but deadlocked, out of connections, or otherwise unable to actually serve traffic. A Dockerfile HEALTHCHECK probes real application behavior (e.g. an HTTP endpoint), catching failures a simple process-alive check would miss."},
        {"question": "You see exit code 137 in production. What''s your first hypothesis and how do you confirm it?", "answer": "OOM kill. Confirm with docker inspect <container> --format ''{{.State.OOMKilled}}'' — if true, the fix is raising the memory limit or fixing a leak, not just restarting it."}
      ]'::jsonb) returning id into v_m4;
    insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
      (v_course_id, 'Docker Security & Best Practices', 4, '[
        {"question": "Why run a container as a non-root user even though it''s already isolated by namespaces?", "answer": "Namespace isolation isn''t perfect — container-escape vulnerabilities exist. If a process is compromised while running as non-root inside the container, an escape hands the attacker a much less privileged foothold than if it were running as root."},
        {"question": "Where should a database password live for a containerized app — and where should it never live?", "answer": "It should live in a mounted secret file or an external secrets manager (Vault, AWS Secrets Manager). It should never be baked into an image layer or passed as a plain ENV variable, since both are readable by anyone who can inspect the image or exec into the container."},
        {"question": "What''s the security benefit of a minimal/distroless base image over a full OS image?", "answer": "Every extra package, shell, and tool in the image is potential attack surface. A minimal image has far fewer components an attacker could exploit if they gain any code execution inside the container."}
      ]'::jsonb) returning id into v_m5;
    insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
      (v_course_id, 'Monitoring & Troubleshooting', 5, '[
        {"question": "Walk through your troubleshooting order for a container that keeps crash-looping.", "answer": "docker ps -a to confirm status and restart count, docker logs for the actual error, docker inspect for exit code and mount configuration, and only then docker exec if it''s staying up long enough to get a shell into."},
        {"question": "A container is \"running\" but the app inside seems unresponsive. What would catch this that a simple process check wouldn''t?", "answer": "A Dockerfile HEALTHCHECK that actively probes the application (e.g. curling a health endpoint) rather than just checking that the process PID exists — the process can be alive and deadlocked at the same time."}
      ]'::jsonb) returning id into v_m6;
    insert into cybersachet_modules (course_id, title, sort_order, interview_questions) values
      (v_course_id, 'Docker in Production & CI/CD', 6, '[
        {"question": "In a CI/CD pipeline, where should image vulnerability scanning happen and why?", "answer": "As a gate before pushing to a registry other environments pull from — so a vulnerable dependency fails the build and never reaches production, rather than being discovered after it''s already deployed."},
        {"question": "Why does Dockerfile layer ordering matter for CI pipeline speed?", "answer": "Docker caches each layer; ordering rarely-changing steps (dependency installs) before frequently-changing ones (source code copy) means most commits only invalidate and rebuild the last layer or two, not the entire image."}
      ]'::jsonb) returning id into v_m7;

    -- Re-sequence the two existing "Why Containers" lessons so the new
    -- motivation/history lessons slot in around them in a sensible reading
    -- order, instead of just appending everything at the end.
    update cybersachet_lessons set sort_order = 1 where course_id = v_course_id and module_id = v_m1 and title = 'Containers vs. virtual machines';
    update cybersachet_lessons set sort_order = 3 where course_id = v_course_id and module_id = v_m1 and title = 'Images, containers, and the Dockerfile';

    insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
    (v_course_id, v_m1, 'Why containers replaced traditional deployment',
     E'For years, the standard way to ship software was: a developer writes code, it works on their machine, then it gets deployed to a server with a different OS version, different library versions, different everything — and it breaks. This is the classic "works on my machine" problem, and it turned every deployment into a debugging session. The old model looked like: Developer writes code → hands it to Ops → Ops fights server differences → application finally runs, maybe. Containers collapse that chain: Developer writes code → packages it with every dependency it needs into a container image → that exact same image runs identically on a laptop, a test server, and production, because the container carries its own filesystem and dependencies with it. Netflix, Spotify, and most large tech companies run thousands of services this way specifically because it removes environment drift as a category of bug entirely — not because containers are trendy, but because "it works in the image" is a guarantee "it works on my machine" never was.',
     'Containers don''t make software better — they make the environment it runs in identical everywhere, which eliminates an entire category of deployment bugs.', 0,
     'What specific problem do containers solve that made companies adopt them at scale?', '["They make code run faster", "They guarantee the exact same environment everywhere, eliminating '' works on my machine'' bugs", "They are required by cloud providers", "They replace the need for testing"]'::jsonb, 1),
    (v_course_id, v_m1, 'A brief history: from chroot to the OCI standard',
     E'Process isolation on Linux didn''t start with Docker. chroot (1979) restricted a process to a subset of the filesystem. LXC (Linux Containers, 2008) added namespaces and cgroups for real isolation and resource limits — the same kernel features Docker still uses today. What Docker actually invented in 2013 wasn''t the isolation technology; it was the developer experience: a simple CLI, a shareable image format, and Docker Hub as a place to publish and pull images — turning a kernel feature only specialists used into something any developer could use in an afternoon. That popularity created a problem: everyone building container tooling risked locking users into one vendor''s image format. The Open Container Initiative (OCI) standardized the image format and runtime spec in 2015, so an image built with Docker can run under containerd, CRI-O, or Podman without changes. This is why Kubernetes doesn''t actually depend on Docker itself anymore — it runs OCI-compliant containers through containerd directly.',
     'Docker''s real innovation was developer experience, not the isolation tech — and the OCI standard it helped create means container images now outlive any single vendor''s tooling.', 2,
     'What did the OCI standard actually solve?', '["It invented process isolation on Linux", "It standardized image/runtime formats so containers aren''t locked to one vendor''s tooling", "It replaced the need for a container runtime", "It created Docker Hub"]'::jsonb, 1),
    (v_course_id, v_m1, 'Docker Hub and image registries',
     E'A registry stores and distributes container images — Docker Hub is the default public one, but AWS ECR, Azure ACR, Google Artifact Registry, and self-hosted Harbor all serve the same purpose privately. Not every image on a public registry is equally trustworthy: Docker Official Images (maintained by Docker in collaboration with upstream projects, like postgres or nginx) and Verified Publisher images carry real accountability; an arbitrary user-uploaded image does not, and pulling one straight into production is a real supply-chain risk — you''re running someone else''s unaudited code with root-level access to your host''s kernel. Tagging matters just as much: :latest is whatever was pushed most recently, which silently changes underneath you — a redeploy today can pull a different image than a redeploy last week. Production systems pin to an explicit, immutable tag (a version number or a git commit SHA) specifically so the same tag always resolves to the same bytes.',
     'Pin to an explicit, immutable tag in production — never :latest — and treat pulling an unverified public image with the same scrutiny as installing unaudited software.', 4,
     'Why is deploying with the :latest tag risky in production?', '["It uses more disk space", "It silently points to different image contents over time, so the same tag can deploy different code on different days", "It''s slower to pull", "It only works with Docker Hub"]'::jsonb, 1),

    (v_course_id, v_m3, 'Installing Docker: Engine, Desktop, and verifying your setup',
     E'Docker ships two different ways depending on your OS. On Linux, Docker Engine installs directly as a daemon (dockerd) talking to the kernel — this is also what every production Linux server actually runs. On Mac and Windows, there''s no native container support in the OS kernel, so Docker Desktop quietly runs a small Linux VM (via a lightweight hypervisor) and routes your docker commands into it — meaning even on a Mac, your containers are still fundamentally Linux containers. Once installed, docker --version confirms the CLI is present, and docker run hello-world is the real smoke test: it pulls a tiny image, runs it, and prints a confirmation message, proving the CLI, the daemon, and image-pulling all work end to end.',
     'On Mac/Windows, Docker Desktop is running a Linux VM behind the scenes — your containers are always Linux containers, regardless of your host OS.', 0,
     'On macOS, what is Docker Desktop actually doing when you run a container?', '["Running the container natively on macOS''s kernel", "Running a lightweight Linux VM behind the scenes and routing containers into it", "Emulating Linux instructions in software", "Nothing — Mac containers don''t use Linux at all"]'::jsonb, 1),
    (v_course_id, v_m3, 'Your first container: the Docker CLI',
     E'docker run is doing three things at once: pulling the image if it isn''t local yet, creating a container from it, and starting it. The flags change how it runs: -d runs it detached (in the background, returning your terminal immediately) instead of attached (blocking, streaming output to your terminal); -it allocates an interactive terminal, essential for anything you want to type into, like a shell; -p 8080:80 maps port 8080 on your host to port 80 inside the container — without it, the container''s port is invisible outside the container network; --name gives it a memorable name instead of Docker''s random one; --rm deletes the container automatically the moment it stops, useful for throwaway testing. docker ps shows what''s currently running; docker ps -a includes stopped containers too — a container doesn''t disappear when it stops, it just stops, and still exists until you docker rm it (or ran it with --rm).',
     'A stopped container isn''t gone — docker ps -a still shows it, and it exists until removed. --rm is how you avoid accumulating dead containers during testing.', 1,
     'You ran a container without --rm and it has since stopped. Where did it go?', '["It was automatically deleted", "It still exists — docker ps -a will show it as Exited until you remove it", "It''s paused and will resume automatically", "Docker keeps it running invisibly"]'::jsonb, 1),

    (v_course_id, v_m4, 'Container lifecycle, logging, and health checks',
     E'A container''s restart policy decides what happens when it stops: no (default) never restarts it automatically; on-failure restarts only if it exited with a non-zero code; always restarts no matter what, even after a manual stop (until you explicitly stop it again); unless-stopped is like always, but respects a manual stop across a host reboot. A HEALTHCHECK in a Dockerfile lets Docker actively probe whether the app inside is actually working, not just whether the process is alive — a container can be "running" while its web server is deadlocked and unable to serve a single request; a healthcheck catches that, a bare process check doesn''t. When something goes wrong, docker logs <container> is the first stop, docker logs -f follows it live, and docker logs --tail 100 limits it to the recent lines instead of scrolling back through everything. The container''s exit code is a real diagnostic clue: 0 means clean exit, 1 usually means the application itself errored, 137 means it was killed with SIGKILL (very often an out-of-memory kill), and 143 means it received SIGTERM (a graceful stop request).',
     'Exit code 137 almost always means the container was OOM-killed — check docker inspect for the OOMKilled flag before assuming it''s an application bug.', 0,
     'A container''s exit code is 137. What does that most likely mean?', '["The application had a bug", "It was killed with SIGKILL — very often an out-of-memory kill", "It exited cleanly", "Networking failed"]'::jsonb, 1),
    (v_course_id, v_m4, 'Resource limits and performance',
     E'By default, a single container can consume all of the host''s CPU and memory — one runaway process can starve every other container on the same machine, a real production incident pattern called the "noisy neighbor" problem. --memory caps how much RAM a container can use; hit the limit and the kernel''s OOM killer terminates it (that''s the 137 exit code from the previous lesson). --cpus caps how much CPU time it can consume, expressed as a count of cores (e.g. --cpus=1.5). Under the hood, both are enforced by cgroups (control groups), the same Linux kernel feature that made LXC-style isolation possible in the first place — Docker didn''t invent resource limiting, it just made it a one-flag command instead of manual cgroup configuration. docker stats shows live CPU/memory/network usage per container, the fastest way to confirm whether a container is actually near its limit or the slowdown is happening somewhere else entirely.',
     'An unbounded container can starve every other container on the same host — always set --memory and --cpus limits before running anything in a shared/production environment.', 1,
     'What Linux kernel feature does --memory and --cpus actually rely on to enforce limits?', '["Namespaces", "cgroups (control groups)", "The OCI runtime spec", "Docker''s own custom scheduler"]'::jsonb, 1),

    (v_course_id, v_m5, 'Image security and minimal, multi-stage builds',
     E'Every package, tool, and library in your image is something an attacker could potentially exploit — a full Ubuntu base image carries a shell, package managers, and dozens of libraries you''ll never use in production, all of it attack surface. Minimal base images (alpine, or "distroless" images with no shell or package manager at all) cut that surface down dramatically. Multi-stage builds solve a related problem: compiling an application often needs a compiler, build tools, and dev dependencies that have no business existing in the final running image. A multi-stage Dockerfile uses one FROM stage to build the app, then a second, separate FROM stage that copies only the compiled output into a clean, minimal base — the build tools never make it into what actually ships. Image scanning tools (Trivy, Docker Scout, Snyk) check every layer against known-CVE databases, catching a vulnerable base image or dependency before it reaches production rather than after.',
     'A multi-stage build lets you compile with a full toolchain in one stage, then ship only the compiled output in a minimal final image — build tools never reach production.', 0,
     'What problem does a multi-stage Dockerfile build solve?', '["It makes builds run faster only", "It lets you use build tools/compilers in one stage while shipping only the compiled output in a minimal final image", "It replaces the need for a registry", "It automatically scans for vulnerabilities"]'::jsonb, 1),
    (v_course_id, v_m5, 'Container security best practices',
     E'By default, a process inside a container runs as root — and while namespaces isolate it from the host, a container-escape vulnerability (a real, if uncommon, category of bug) turns "root inside the container" into a much scarier "root on the host." A USER instruction in the Dockerfile, running the process as a non-root user, removes an entire class of risk even if something inside the container is compromised. Never mount the Docker socket (/var/run/docker.sock) into a container unless you fully understand the implication: a container with access to the host''s Docker socket can create new containers with full host access — effectively root on the host, no escape needed. Secrets (API keys, database passwords) should never be baked into an image layer or passed as a plain ENV — both are visible to anyone who can inspect the image or exec into the container; use mounted secret files or a real secrets manager (Vault, AWS Secrets Manager) instead. --cap-drop=ALL plus only the specific Linux capabilities a container actually needs is the least-privilege default most production setups should start from.',
     'Mounting the Docker socket into a container effectively hands it root on the host — treat that mount with the same caution as handing out a root SSH key.', 1,
     'Why is mounting /var/run/docker.sock into a container a serious security risk?', '["It slows down the container", "It gives that container the ability to create new containers with full host access — effectively root on the host", "It''s only a risk on Windows", "It prevents the container from starting"]'::jsonb, 1),

    (v_course_id, v_m6, 'Debugging a failed container, systematically',
     E'Guessing wastes time; a fixed sequence finds the real cause faster. First, docker ps -a — is it actually stopped, or did it never start (look at STATUS)? Second, docker logs <name> — this alone answers most failures: a missing environment variable, a config file that doesn''t exist, a stack trace from the app itself. Third, docker inspect <name> — check the exit code, the mounts (is a volume actually where the app expects it?), and restart count. If it''s still running but misbehaving, docker exec -it <name> sh gets you a shell inside to poke around directly. A handful of causes cover most real incidents: a missing or misspelled environment variable the app requires at startup; the wrong CMD/ENTRYPOINT for what the image actually expects; a port collision on the host; a volume mount with the wrong permissions for the user the process runs as inside the container. Working this list in order, instead of randomly restarting things, is what separates a two-minute diagnosis from a twenty-minute one.',
     'Work the same order every time: docker ps -a for status, docker logs for what happened, docker inspect for exit code/mounts, docker exec only once it''s confirmed running.', 0,
     'A container exits immediately after docker run. What''s the first command to run?', '["docker restart", "docker logs <name>", "docker rm -f", "docker system prune"]'::jsonb, 1),

    (v_course_id, v_m7, 'Docker Compose for real multi-container apps',
     E'Almost nothing real is a single container — a typical app is a web service, a database, and maybe a cache, each with its own image, ports, and configuration. docker-compose.yml describes the entire stack in one file: each service maps to one container, depends_on controls startup order (though not full readiness — a database container "starting" isn''t the same as being ready to accept connections, which is what a healthcheck is for), environment sets variables per service, and a shared networks entry lets services reach each other by service name automatically, the same Docker DNS behavior from the networking lesson. docker compose up starts the whole stack, -d runs it detached, docker compose logs -f follows every service''s logs together, and docker compose down tears it all down — one command replacing a sequence of manual docker run commands that have to be typed in exactly the right order every time.',
     'depends_on controls start order, not readiness — a database container starting isn''t the same as being ready for connections; that gap is what healthchecks exist to close.', 0,
     'In docker-compose.yml, what does depends_on actually guarantee?', '["The dependency service is fully ready to accept connections", "Only that the dependency container has started — not that it''s ready", "Nothing — it''s ignored by Compose", "It sets up networking between services"]'::jsonb, 1),
    (v_course_id, v_m7, 'Docker in CI/CD pipelines',
     E'A CI/CD pipeline typically builds a Docker image as its final artifact: checkout code, run tests, then docker build and push to a registry the deployment environment can pull from. Tagging strategy matters here more than anywhere else: tagging every build with the git commit SHA (or a semantic version) means you can always trace a running container back to the exact code that produced it — tagging everything latest throws that traceability away. Image scanning belongs as a pipeline gate, not an afterthought: scan the built image for known CVEs before pushing it to a registry other environments will pull from, so a vulnerable dependency fails the build instead of reaching production quietly. Layer caching is what keeps pipeline builds fast: ordering a Dockerfile so rarely-changing steps (installing dependencies) happen before frequently-changing steps (copying source code) means a pipeline that runs on every commit only rebuilds the last layer or two most of the time, not the whole image from scratch.',
     'Tag every CI-built image with its git commit SHA, not just latest — it''s the difference between being able to trace a production incident back to exact code and not being able to.', 1,
     'Why tag CI-built images with a git commit SHA instead of only ''latest''?', '["It makes builds faster", "It lets you trace exactly which code produced any running container, which ''latest'' alone doesn''t provide", "It''s required by Docker Hub", "It reduces image size"]'::jsonb, 1)
    on conflict do nothing;

    -- Lab metadata for the 6 hands-on lessons above.
    update cybersachet_lessons set lab = '{
      "objective": "Get Docker running locally and confirm the full CLI-to-daemon-to-registry path works.",
      "environment": "Linux, macOS, or Windows with virtualization enabled",
      "tools": ["Docker Engine (Linux) or Docker Desktop (Mac/Windows)", "A terminal"],
      "steps": [
        "Install Docker Engine (Linux) or Docker Desktop (Mac/Windows) from docker.com",
        "Run docker --version to confirm the CLI is installed",
        "Run docker run hello-world to pull and run the test image",
        "Run docker info to see your daemon''s configuration, including the storage driver"
      ],
      "troubleshooting": "Linux ''permission denied'' on the socket → your user isn''t in the docker group yet (sudo usermod -aG docker $USER, then log out/in). Docker Desktop stuck starting on Windows → WSL2 backend isn''t enabled or needs an update. ''Cannot connect to the Docker daemon'' → the daemon/Desktop app isn''t actually running yet.",
      "challenge": "Run docker info and identify which storage driver your installation is using (look for the Storage Driver line)."
    }'::jsonb where course_id = v_course_id and title = 'Installing Docker: Engine, Desktop, and verifying your setup';

    update cybersachet_lessons set lab = '{
      "objective": "Get comfortable with the core container lifecycle commands you''ll use every day.",
      "environment": "A working Docker installation from the previous lab",
      "tools": ["Docker CLI"],
      "steps": [
        "Run docker run -d --name web -p 8080:80 nginx and visit localhost:8080",
        "Run docker ps to see it running, then docker stop web",
        "Run docker ps -a to see it still listed as Exited",
        "Run docker start web to bring it back, then docker rm -f web to remove it entirely",
        "Run docker run -it --rm ubuntu bash to get an interactive shell, then exit and confirm with docker ps -a that it''s gone"
      ],
      "troubleshooting": "''port is already allocated'' → something else is already using 8080; stop it or pick a different host port. Container exits immediately after docker run -d → check docker logs <name>, the process inside likely crashed or the image expects a command that wasn''t given.",
      "challenge": "Start an nginx container without -p at all, then try to curl it from your host. Explain in one sentence why it fails."
    }'::jsonb where course_id = v_course_id and title = 'Your first container: the Docker CLI';

    update cybersachet_lessons set lab = '{
      "objective": "Diagnose why a container keeps restarting, using logs and exit codes rather than guessing.",
      "environment": "A working Docker installation",
      "tools": ["Docker CLI"],
      "steps": [
        "Run docker run -d --name flaky --restart on-failure busybox sh -c \"echo starting; sleep 2; exit 1\"",
        "Wait ~15 seconds, then run docker ps -a and note the restart count",
        "Run docker logs flaky to see its output history across restarts",
        "Run docker inspect flaky --format ''{{.State.ExitCode}}'' to confirm the exit code",
        "Clean up with docker rm -f flaky"
      ],
      "troubleshooting": "Restart count keeps climbing forever → that''s expected with on-failure and a command that always exits 1; in a real incident, this is exactly the symptom that should send you to docker logs immediately, not to restarting it again.",
      "challenge": "Change the restart policy to no and re-run the same test. Explain what you''d see differently in docker ps -a."
    }'::jsonb where course_id = v_course_id and title = 'Container lifecycle, logging, and health checks';

    update cybersachet_lessons set lab = '{
      "objective": "See resource limits actually take effect, including what an OOM kill looks like from the outside.",
      "environment": "A working Docker installation",
      "tools": ["Docker CLI", "stress-ng or a small memory-allocating script"],
      "steps": [
        "Run docker run -d --name limited --memory=50m polinux/stress stress --vm 1 --vm-bytes 100M",
        "Run docker ps -a and confirm the container has already exited",
        "Run docker inspect limited --format ''{{.State.OOMKilled}}'' and confirm it shows true",
        "Re-run with --memory=200m instead and confirm it now stays running with docker stats limited"
      ],
      "troubleshooting": "Image not found → stress/stress-ng images vary by architecture (Apple Silicon vs. Intel); substitute any small memory-stress image available for your platform.",
      "challenge": "Using docker stats, find a way to confirm a running container''s CPU usage while it''s under a --cpus=0.5 limit, and explain what you''d expect to see if it tries to use more."
    }'::jsonb where course_id = v_course_id and title = 'Resource limits and performance';

    update cybersachet_lessons set lab = '{
      "objective": "Practice the real troubleshooting sequence against a deliberately broken container.",
      "environment": "A working Docker installation",
      "tools": ["Docker CLI"],
      "steps": [
        "Run docker run -d --name broken -e REQUIRED_VAR= postgres:16 (missing a required password variable)",
        "Run docker ps -a and note it exited quickly",
        "Run docker logs broken and read the actual error message from postgres itself",
        "Fix it: docker rm broken then re-run with -e POSTGRES_PASSWORD=devpass and confirm it now stays running"
      ],
      "troubleshooting": "If the error message doesn''t obviously point to a missing variable, that''s realistic — read the full log output, not just the last line; the real cause is often a few lines up from where the container gives up.",
      "challenge": "Deliberately misspell POSTGRES_PASSWORD as POSTGRES_PASSWRD and predict what docker logs will show before running it."
    }'::jsonb where course_id = v_course_id and title = 'Debugging a failed container, systematically';

    update cybersachet_lessons set lab = '{
      "objective": "Stand up a real multi-container app (web + database) from a single compose file.",
      "environment": "A working Docker installation with Compose (bundled with Docker Desktop, or the docker-compose-plugin on Linux)",
      "tools": ["Docker Compose"],
      "steps": [
        "Create a docker-compose.yml with two services: web (nginx, port 8080:80) and db (postgres:16, with POSTGRES_PASSWORD set, and a named volume for /var/lib/postgresql/data)",
        "Run docker compose up -d",
        "Run docker compose ps to confirm both services are up",
        "Run docker compose logs db to confirm postgres finished initializing",
        "Run docker compose down — then docker compose up -d again and confirm the database''s data persisted"
      ],
      "troubleshooting": "''web'' can''t reach ''db'' by hostname → confirm both services are on the same compose network (they are, by default, unless you''ve defined custom networks that separate them).",
      "challenge": "Add a third cache service using redis, and confirm from inside the web container (docker compose exec web sh) that ping cache resolves — proving Docker''s built-in service-name DNS."
    }'::jsonb where course_id = v_course_id and title = 'Docker Compose for real multi-container apps';
  end if;

  -- Broaden the final assessment to cover the new modules (existing 4
  -- questions stay at sort_order 0-3, unchanged).
  if not exists (select 1 from cybersachet_quiz_questions where course_id = v_course_id and sort_order = 4) then
    insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, correct_indexes, correct_order, sort_order) values
    (v_course_id, 'What''s the main risk of pulling an arbitrary, unverified image from a public registry into production?', '["It will be slower to start", "You''re running someone else''s unaudited code with root-level access to your host''s kernel", "It costs more to store", "It won''t support volumes"]'::jsonb, 'single', 1, null, null, 4),
    (v_course_id, 'A container exits with code 137. What does that most likely indicate?', '["A clean, intentional exit", "It was OOM-killed (SIGKILL, often out of memory)", "A network timeout", "A missing Dockerfile instruction"]'::jsonb, 'single', 1, null, null, 5),
    (v_course_id, 'What Linux kernel mechanism does --memory and --cpus rely on?', '["Namespaces only", "cgroups", "The OCI runtime spec", "Docker''s proprietary scheduler"]'::jsonb, 'single', 1, null, null, 6),
    (v_course_id, 'Why is mounting the Docker socket into a container dangerous?', '["It slows the container down", "It effectively grants that container root access to the host", "It''s only a Windows-specific issue", "It disables logging"]'::jsonb, 'single', 1, null, null, 7),
    (v_course_id, 'Select every real Docker security best practice (choose all that apply):', '["Run containers as a non-root user where possible", "Bake secrets directly into the image so they''re always available", "Scan images for known CVEs before deploying", "Use minimal or distroless base images to reduce attack surface"]'::jsonb, 'multiple', null, array[0,2,3], null, 8),
    (v_course_id, 'Arrange the correct troubleshooting order for a crashing container:', '["docker inspect for exit code and mounts", "docker ps -a for status", "docker exec for a live shell (if running)", "docker logs for the actual error"]'::jsonb, 'ordering', null, null, array[1,3,0,2], 9)
    on conflict do nothing;
  end if;
end $$;
