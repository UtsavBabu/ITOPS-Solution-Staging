-- Real seed content for the "academy" track (Cloud/DevOps/Infrastructure),
-- so the new Moonsav ITOps Academy marketing page and catalog have genuine
-- courses to show rather than an honest-but-empty "launching soon" page.
-- Same real shape as every CyberSachet course: modules, lessons with a
-- comprehension check, and a real graded quiz — nothing here is a stub to
-- fill in later.

insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track) values
  ('linux-fundamentals-for-it-operations', 'Linux Fundamentals for IT Operations', 'The commands and concepts you actually use running Linux servers day to day — the filesystem layout, permissions, processes, and package management every other Academy course builds on.', 'beginner', 20, true, 100, 'infrastructure', 'STARTER', true, 'academy'),
  ('cloud-computing-essentials', 'Cloud Computing Essentials', 'What "the cloud" actually is, the service models (IaaS/PaaS/SaaS) and shared responsibility model, and the core building blocks — compute, storage, and networking — behind AWS, Azure, and every other provider.', 'beginner', 18, true, 101, 'cloud', 'PROFESSIONAL', false, 'academy'),
  ('intro-to-devops-and-cicd', 'Introduction to DevOps & CI/CD', 'Why DevOps exists, how a CI/CD pipeline actually works from commit to deploy, and the practices — version control, automated testing, infrastructure as code — that make frequent, reliable releases possible.', 'intermediate', 22, true, 102, 'devops', 'PROFESSIONAL', false, 'academy')
on conflict (slug) do nothing;

do $$
declare
  v_course_id uuid;
  v_m1 uuid;
  v_m2 uuid;
begin
  -- Linux Fundamentals for IT Operations
  select id into v_course_id from cybersachet_courses where slug = 'linux-fundamentals-for-it-operations';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Finding Your Way Around', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Permissions, Processes & Packages', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'The filesystem layout',
   E'Every Linux system is organized under a single root directory, `/` — there''s no separate drive letter per disk the way Windows uses C:\\ and D:\\. A few directories matter most day to day: `/etc` holds system-wide configuration files, `/var` holds data that changes over time (most importantly `/var/log`, where nearly every service writes its logs), `/home` holds each user''s personal files, and `/tmp` is scratch space that''s often cleared on reboot. When something breaks, `/var/log` is usually the first place to look, and when you need to change how a service behaves, `/etc` is usually where its config file lives.',
   'When troubleshooting, check /var/log first for what happened and /etc for how a service is configured.', 0,
   'Where would you look first to find out why a service crashed?', '["/home", "/var/log", "/tmp", "/etc"]'::jsonb, 1),
  (v_course_id, v_m1, 'Navigating and reading files from the shell',
   E'`pwd` prints your current directory, `ls -la` lists everything in it including hidden files (anything starting with a dot) with permissions and sizes, and `cd` changes directory — `cd ..` goes up one level, `cd ~` goes home. To read a file without opening an editor, `cat` dumps the whole thing to the screen (fine for short files), `less` lets you scroll through a long one a page at a time, and `tail -f /var/log/some.log` follows a log file live as new lines are written — the single most-used command when watching a service start up or debugging something happening right now.',
   '`tail -f` on a log file is how you watch what a service is doing in real time, not just what it already did.', 1,
   'You want to watch a log file update live as a service runs. Which command?', '["cat logfile", "less logfile", "tail -f logfile", "pwd logfile"]'::jsonb, 2),
  (v_course_id, v_m2, 'File permissions and ownership',
   E'`ls -l` shows permissions as a 10-character string like `-rwxr-xr--`: the first character is the file type (`-` for a regular file, `d` for a directory), then three groups of three — owner, group, and everyone else — each showing read (r), write (w), and execute (x). `chmod` changes permissions (`chmod 755 script.sh` gives the owner full access and everyone else read+execute), and `chown user:group file` changes who owns it. Execute permission on a directory means "can enter it," not "can run it" — a common point of confusion.',
   'Permissions are owner / group / everyone, each with read, write, and execute — chmod changes them, chown changes who owns the file.', 0,
   'What does the "x" permission mean on a directory (not a file)?', '["You can execute the directory as a program", "You can enter (cd into) the directory", "You can delete the directory", "It has no effect on directories"]'::jsonb, 1),
  (v_course_id, v_m2, 'Processes, services, and package managers',
   E'`ps aux` lists every running process; `top` (or `htop` if installed) shows them live, sorted by resource usage, which is usually the fastest way to spot what''s consuming CPU or memory. Most modern Linux distributions manage background services with `systemd` — `systemctl status nginx` shows whether a service is running and its recent log lines, `systemctl restart nginx` restarts it, and `systemctl enable nginx` makes it start automatically on boot. To install software, Debian/Ubuntu systems use `apt install package-name` and Red Hat/CentOS/Fedora systems use `dnf install package-name` (or the older `yum`) — same idea, different tool depending on the distribution family.',
   'systemctl status/restart/enable is how you check and control services on most modern Linux distributions.', 1,
   'Which command shows whether a service is currently running and its recent logs?', '["ps aux", "systemctl status servicename", "apt install servicename", "chmod servicename"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'Where does most Linux system configuration live?', '["/tmp", "/home", "/etc", "/var"]'::jsonb, 'single', 2, 0),
  (v_course_id, 'A file shows permissions "-rwxr--r--". Can someone outside the owner''s group run it as a program?', '["Yes, everyone has execute", "No, only the owner has execute permission", "Only the group can", "Permissions don''t affect execution"]'::jsonb, 'single', 1, 1),
  (v_course_id, 'Which command restarts a systemd-managed service?', '["chmod restart nginx", "systemctl restart nginx", "apt restart nginx", "ps restart nginx"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'On Ubuntu, which command installs a new package?', '["dnf install package", "systemctl install package", "apt install package", "chown install package"]'::jsonb, 'single', 2, 3)
  on conflict do nothing;
  end if;

  -- Cloud Computing Essentials
  select id into v_course_id from cybersachet_courses where slug = 'cloud-computing-essentials';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'What Cloud Actually Means', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'The Building Blocks', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'IaaS, PaaS, and SaaS',
   E'The three service models differ in how much a provider manages for you. Infrastructure as a Service (IaaS — e.g. an AWS EC2 virtual machine) gives you raw compute, storage, and networking; you still install and manage the OS and everything above it. Platform as a Service (PaaS — e.g. AWS Elastic Beanstalk or Heroku) manages the OS and runtime for you, so you deploy code and the platform handles scaling and patching. Software as a Service (SaaS — e.g. Gmail or Salesforce) is a finished application you just use — nothing to provision or patch at all. Moving from IaaS toward SaaS trades control for convenience.',
   'IaaS gives you raw infrastructure to manage yourself, PaaS manages the runtime for you, SaaS is a finished application you just use.', 0,
   'You deploy your own application code and the platform handles the OS, patching, and scaling for you. Which service model is this?', '["IaaS", "PaaS", "SaaS", "None of these"]'::jsonb, 1),
  (v_course_id, v_m1, 'The shared responsibility model',
   E'Cloud security is a shared job, not something you can outsource entirely. The provider (AWS, Azure, GCP) secures "the cloud" — physical data centers, the underlying hardware, and the virtualization layer. You''re responsible for security "in the cloud" — how you configure access controls, which ports you leave open, whether your storage buckets are accidentally public, and how you patch your own operating systems on IaaS. The exact line shifts depending on the service model: the more of the stack the provider manages (PaaS, SaaS), the less you''re responsible for — but you''re never responsible for zero.',
   'The provider secures the underlying cloud infrastructure; you''re always responsible for how you configure and use it.', 1,
   'Under the shared responsibility model, who is responsible for correctly configuring access permissions on your own cloud storage?', '["The cloud provider, always", "You, the customer", "Neither party — it''s automatic", "Only relevant for on-premises systems"]'::jsonb, 1),
  (v_course_id, v_m2, 'Compute and storage basics',
   E'Compute is the processing power that runs your workloads — a virtual machine (like an AWS EC2 instance or Azure VM) behaves like a regular server you can SSH into, while a container (like AWS Fargate or Google Cloud Run) packages an application to run without you managing a full OS underneath it. Storage comes in a few shapes: object storage (like AWS S3) holds files accessed over HTTP, ideal for backups, media, and static website assets; block storage (like an EBS volume) behaves like an attached hard drive for a VM; and managed databases (like AWS RDS) run a real database engine without you administering the underlying server.',
   'Object storage is for files over HTTP, block storage attaches to a VM like a hard drive, managed databases run the engine without you administering the server.', 0,
   'Which storage type would you use to host static website assets and backups, accessed over HTTP?', '["Block storage", "Object storage", "A managed database", "None — that requires a physical server"]'::jsonb, 1),
  (v_course_id, v_m2, 'Networking and regions',
   E'Cloud providers organize infrastructure into regions (geographic areas, like us-east-1 or eu-west-2), each containing multiple availability zones — physically separate data centers with independent power and networking, so a failure in one doesn''t take down the others. A Virtual Private Cloud (VPC) is your own isolated network within a region, where you define subnets, routing, and firewall-like security groups that control what traffic can reach your resources. Placing resources across multiple availability zones is the standard way to build for high availability — if one zone has an outage, the others keep serving traffic.',
   'Spreading resources across multiple availability zones within a region is how cloud architectures stay available through a single data-center failure.', 1,
   'Why would you deploy an application across multiple availability zones instead of just one?', '["It''s required by every cloud provider", "So an outage in one zone doesn''t take down the whole application", "It''s the only way to get a public IP address", "Availability zones are just a billing concept, not physical separation"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'Which service model gives you the most control but requires you to manage the OS yourself?', '["SaaS", "PaaS", "IaaS", "None of these require OS management"]'::jsonb, 'single', 2, 0),
  (v_course_id, 'Under the shared responsibility model, what does the cloud provider secure?', '["Your application code", "The underlying physical infrastructure and virtualization layer", "Your firewall rules", "Your access control configuration"]'::jsonb, 'single', 1, 1),
  (v_course_id, 'What''s the difference between block storage and object storage?', '["They are the same thing", "Block storage attaches to a VM like a drive; object storage holds files accessed over HTTP", "Object storage is only for databases", "Block storage cannot be resized"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'What is an availability zone?', '["A billing region", "A physically separate data center within a cloud region", "A type of virtual machine", "A security group rule"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;

  -- Introduction to DevOps & CI/CD
  select id into v_course_id from cybersachet_courses where slug = 'intro-to-devops-and-cicd';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Why DevOps Exists', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'How a Pipeline Actually Works', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'Breaking down the wall between Dev and Ops',
   E'Historically, a development team wrote code and "threw it over the wall" to a separate operations team responsible for deploying and running it — different goals (ship features vs. keep things stable), different tools, and a slow, blame-prone handoff whenever something broke in production. DevOps is the practice of merging those responsibilities: the same team (or closely collaborating teams) builds, tests, deploys, and operates the software, using automation to make frequent releases safe instead of risky. It''s a cultural and process shift as much as a toolset — the tools (CI/CD pipelines, infrastructure as code) exist to support that shift, not the other way around.',
   'DevOps merges development and operations responsibilities so the same team ships and runs software, using automation to make frequent releases safe.', 0,
   'What is DevOps most fundamentally about?', '["A specific tool you install", "Merging development and operations responsibilities with automation to enable safe, frequent releases", "Replacing operations teams entirely with software", "A programming language"]'::jsonb, 1),
  (v_course_id, v_m1, 'Version control as the foundation',
   E'Every DevOps practice assumes code lives in a version control system like Git — a full history of every change, who made it, and why, with the ability to branch (work on a change in isolation) and merge (bring it back into the main codebase) without stepping on other people''s work. A pull request (or merge request) is where a proposed change gets reviewed by teammates before it merges — this is the real quality gate in most teams, catching bugs and design issues before code ever reaches a pipeline. Nothing else in a CI/CD pipeline works without this foundation, since the pipeline triggers off changes to the repository.',
   'A pull request is where code gets reviewed before merging — the real quality gate before automation even runs.', 1,
   'What triggers a CI/CD pipeline to run in most setups?', '["A scheduled time only", "A change pushed to the version control repository", "A manual phone call to operations", "Nothing — pipelines run constantly regardless of changes"]'::jsonb, 1),
  (v_course_id, v_m2, 'Continuous Integration: build and test automatically',
   E'Continuous Integration (CI) means every code change automatically triggers a build and a test run — not "we''ll test it before the next release," but on every single commit or pull request. This catches problems within minutes of them being introduced, while the context is still fresh, instead of weeks later during a manual pre-release test pass. A typical CI job: check out the code, install dependencies, run the automated test suite, and report pass/fail back to the pull request — a red (failing) build blocks the change from merging until it''s fixed.',
   'CI means every commit automatically triggers a build and test run, catching problems within minutes instead of at release time.', 0,
   'What does Continuous Integration (CI) mean in practice?', '["Manually testing code once a month", "Every code change automatically triggers an automated build and test run", "Only testing code right before a major release", "Integrating with third-party APIs"]'::jsonb, 1),
  (v_course_id, v_m2, 'Continuous Delivery/Deployment and infrastructure as code',
   E'Continuous Delivery extends CI one step further: once code passes automated tests, it''s automatically packaged and made ready to deploy — a human still clicks "deploy," typically to production. Continuous Deployment goes all the way: passing changes deploy automatically, with no manual approval step, relying entirely on the automated tests to be the safety net. Infrastructure as code (tools like Terraform) applies the same version-controlled, automated approach to the servers and cloud resources themselves — instead of manually clicking through a cloud console, infrastructure is defined in files, reviewed like code, and applied automatically, so an environment can be recreated identically instead of drifting over time.',
   'Continuous Deployment removes the manual approval step entirely — passing automated tests is what ships the change to production.', 1,
   'What''s the key difference between Continuous Delivery and Continuous Deployment?', '["They are identical terms", "Continuous Delivery requires a manual approval to deploy; Continuous Deployment deploys automatically with no manual step", "Continuous Deployment is only for infrastructure, not application code", "Continuous Delivery skips automated testing"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'DevOps is best described as:', '["A single software product", "A cultural and process shift merging dev and ops, supported by automation", "A replacement for version control", "A cloud provider"]'::jsonb, 'single', 1, 0),
  (v_course_id, 'What is a pull request used for?', '["Deploying code directly to production", "Having teammates review a proposed change before it merges", "Deleting old branches", "Installing dependencies"]'::jsonb, 'single', 1, 1),
  (v_course_id, 'A build automatically runs tests on every commit and reports pass/fail. This is an example of:', '["Continuous Deployment", "Continuous Integration", "Infrastructure as code", "Shared responsibility"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'What does "infrastructure as code" let you do?', '["Write application code faster", "Define and version-control servers/cloud resources so environments can be recreated identically", "Replace the need for testing", "Skip using a cloud provider"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;
end $$;
