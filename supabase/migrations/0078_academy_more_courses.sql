-- Two more real Academy-track courses, extending the original three
-- (Linux Fundamentals, Cloud Computing Essentials, Intro to DevOps & CI/CD)
-- with the networking and containers topics a Cloud/DevOps/Infrastructure
-- catalog needs next — same real shape as every other CyberSachet/Academy
-- course: modules, lessons with a comprehension check, and a real graded
-- quiz, nothing stubbed.

insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track) values
  ('networking-fundamentals-for-it-operations', 'Networking Fundamentals for IT Operations', 'How data actually moves between machines — IP addresses and subnets, DNS, ports and protocols, and the command-line tools you reach for first when something can''t connect.', 'beginner', 20, true, 103, 'infrastructure', 'STARTER', true, 'academy'),
  ('docker-and-container-fundamentals', 'Docker & Container Fundamentals', 'What a container actually is versus a virtual machine, how to build one with a Dockerfile, and the day-to-day Docker commands — including volumes, networking, and docker-compose — every DevOps course after this one assumes you already know.', 'intermediate', 22, true, 104, 'devops', 'PROFESSIONAL', false, 'academy')
on conflict (slug) do nothing;

do $$
declare
  v_course_id uuid;
  v_m1 uuid;
  v_m2 uuid;
begin
  -- Networking Fundamentals for IT Operations
  select id into v_course_id from cybersachet_courses where slug = 'networking-fundamentals-for-it-operations';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'How Networks Actually Move Data', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Ports, Protocols & Troubleshooting', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'IP addresses and subnets',
   E'Every device on a network gets an IP address — for IPv4, four numbers 0-255 separated by dots, like 192.168.1.42. A subnet mask (or the /24 shorthand, called CIDR notation) marks off how much of that address identifies the network versus the specific device: 192.168.1.0/24 means the first three numbers identify the network and the last one identifies the device, giving room for 254 usable devices on that network. Two devices can only talk directly without a router if they''re on the same subnet — this is why "what subnet is this on" is one of the first questions to ask when a device can''t reach another one. Private ranges like 192.168.x.x, 10.x.x.x, and 172.16-31.x.x are reserved for internal networks and never routed on the public internet directly, which is why NAT (network address translation) exists at your router''s edge.',
   'Two devices need to be on the same subnet to talk directly without a router — that''s the first thing to check for a "can''t connect" issue.', 0,
   'Two devices are on different subnets. What do they need to communicate?', '["Nothing extra — they can always talk directly", "A router to pass traffic between the subnets", "The same MAC address", "A public IP address each"]'::jsonb, 1),
  (v_course_id, v_m1, 'DNS: how names become IP addresses',
   E'Nobody types an IP address to visit a website — DNS (Domain Name System) translates a human-readable name like example.com into the IP address a computer actually needs to connect. A DNS lookup walks a hierarchy: your device asks a resolver (often your ISP''s or a public one like 1.1.1.1), which asks the root servers, which point to the right top-level domain server (.com, .org), which points to the domain''s own authoritative nameserver for the final answer. Results are cached for a TTL (time to live) so this whole chain doesn''t repeat on every request — which is also why a DNS change (like pointing a domain at a new server) can take time to be visible everywhere: it''s waiting for old cached answers to expire.',
   'A DNS change isn''t instant everywhere — it takes effect as each resolver''s cached answer expires according to its TTL.', 1,
   'Why doesn''t a DNS change show up everywhere instantly?', '["DNS changes are always instant", "Resolvers cache the old answer until its TTL expires", "DNS only updates once a day by design", "It requires restarting every device on the internet"]'::jsonb, 1),
  (v_course_id, v_m2, 'Ports and common protocols',
   E'An IP address gets you to the right machine; a port number gets you to the right service running on it — a single server can run a website on port 443 (HTTPS), email on port 25, and SSH on port 22 simultaneously, each isolated by port number. Some ports are so standard they''re assumed by default: 80 for HTTP, 443 for HTTPS, 22 for SSH, 53 for DNS, 3389 for Windows Remote Desktop. TCP is the reliable, connection-based protocol most services use (it confirms delivery and retransmits lost data); UDP is faster but doesn''t guarantee delivery, used where speed matters more than perfection, like video streaming or DNS lookups. A firewall''s core job is deciding which ports are allowed in or out — "the connection is refused" almost always means a firewall or the service itself is blocking that port.',
   'A port number routes traffic to the right service on a machine; a firewall''s core job is deciding which ports are allowed through.', 0,
   'What is the standard port for HTTPS traffic?', '["21", "80", "443", "3389"]'::jsonb, 2),
  (v_course_id, v_m2, 'Troubleshooting connectivity from the command line',
   E'When something can''t connect, a fixed sequence of commands narrows down where the problem is. ping tests basic reachability — does a response come back at all, and how long does it take. traceroute (or tracert on Windows) shows every hop the traffic takes to get there, which pinpoints where along the path it''s failing, not just that it is failing. netstat or the newer ss command lists active network connections and which ports are actively listening on the local machine — useful for confirming a service is actually running and bound to the port you expect. curl or telnet against a specific host and port tests whether that exact service is reachable, which is more precise than ping (which only tests the network layer, not whether a particular service is actually listening).',
   'Work top-down: ping for reachability, traceroute for where it breaks, then test the exact port with curl/telnet.', 1,
   'A ping succeeds but a specific service still won''t connect. What''s the next logical check?', '["The problem must be DNS", "Test the exact host and port directly with curl or telnet", "Restart the entire network", "Ping is proof the service is fine, stop troubleshooting"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'What does a subnet mask (or /24 notation) actually define?', '["The device''s MAC address", "How much of an IP address identifies the network versus the device", "The DNS server to use", "The device''s hostname"]'::jsonb, 'single', 1, 0),
  (v_course_id, 'What does DNS actually do?', '["Encrypts network traffic", "Translates human-readable domain names into IP addresses", "Assigns IP addresses to devices", "Blocks unauthorized ports"]'::jsonb, 'single', 1, 1),
  (v_course_id, 'A server runs a website and SSH at the same time. How does incoming traffic get routed to the right one?', '["By port number", "By MAC address", "By subnet mask", "It can''t — one server can only run one service"]'::jsonb, 'single', 0, 2),
  (v_course_id, 'You can ping a server but a specific web app on it won''t load. What''s the most useful next step?', '["Assume the whole network is down", "Test the exact port with curl or telnet", "Give up on the network layer entirely", "Change the server''s IP address"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;

  -- Docker & Container Fundamentals
  select id into v_course_id from cybersachet_courses where slug = 'docker-and-container-fundamentals';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Why Containers', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Working With Docker Day to Day', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'Containers vs. virtual machines',
   E'A virtual machine virtualizes an entire computer — its own kernel, its own OS, running on top of a hypervisor — which makes it heavy (gigabytes, minutes to boot) but fully isolated. A container shares the host machine''s kernel and only packages the application plus its dependencies, making it lightweight (megabytes, starts in seconds) while still isolating the app''s filesystem, processes, and network from everything else on the host. The tradeoff: a VM can run a completely different OS than its host; a Linux container needs a Linux kernel underneath (which is why Docker on Mac/Windows quietly runs a small Linux VM to host the containers). For most application deployment, containers win on speed and density — running far more containers than VMs on the same hardware — which is why they became the default unit of deployment for modern applications.',
   'Containers share the host kernel and only package the app plus dependencies — lightweight and fast, but not a full separate OS like a VM.', 0,
   'What is the key difference between a container and a virtual machine?', '["Containers are always slower to start", "A container shares the host kernel instead of virtualizing a whole OS", "Virtual machines use less disk space", "There is no real difference"]'::jsonb, 1),
  (v_course_id, v_m1, 'Images, containers, and the Dockerfile',
   E'An image is a read-only template — application code, a runtime, libraries, and configuration, all bundled together — and a container is a running instance of that image, the same relationship a class has to an object. A Dockerfile is the recipe that builds an image: FROM picks a base image (like python:3.12 or node:20), COPY adds your application files in, RUN executes setup commands (like installing dependencies) at build time, and CMD defines what runs when a container starts from it. Images are built in layers, and Docker caches each layer — reordering a Dockerfile so rarely-changing steps (like installing dependencies) come before frequently-changing steps (like copying your source code) means most builds only re-run the last layer or two, dramatically speeding up iteration.',
   'Order a Dockerfile so rarely-changing steps come first — Docker''s layer cache means only the changed layers rebuild.', 1,
   'In a Dockerfile, what does the RUN instruction do?', '["Starts the container when it runs", "Executes a command at image build time, like installing dependencies", "Copies files from the host into the image", "Names the resulting image"]'::jsonb, 1),
  (v_course_id, v_m2, 'Core Docker commands',
   E'docker build -t myapp . builds an image from the Dockerfile in the current directory and tags it "myapp". docker run -d -p 8080:80 myapp starts a container from that image in the background (-d, detached) and maps port 8080 on the host to port 80 inside the container — without that mapping, the container''s port is only reachable from other containers, not the host machine. docker ps lists running containers; add -a to see stopped ones too. docker logs <container> shows a container''s output, the first place to look when something crashes right after starting. docker exec -it <container> bash opens an interactive shell inside a running container — useful for poking around, though a container you''re regularly shelling into to fix things is usually a sign the image itself needs fixing instead.',
   '-p host:container maps a port out to the host — without it, a container''s service is only reachable from other containers.', 0,
   'What does the -p flag do in `docker run -p 8080:80 myapp`?', '["Names the container", "Maps port 8080 on the host to port 80 inside the container", "Pauses the container after starting", "Pulls a newer image version"]'::jsonb, 1),
  (v_course_id, v_m2, 'Volumes, networking, and docker-compose',
   E'A container''s own filesystem is ephemeral — delete the container and any data written inside it is gone. A volume (docker run -v mydata:/var/lib/data) persists data outside the container''s lifecycle, on the host, so a database container can be recreated without losing its data. By default, containers on the same Docker network can reach each other by container name — Docker''s built-in DNS resolves "database" to the right container IP automatically, no hardcoded IPs needed. Running a real application usually means multiple containers (a web app, a database, a cache), and docker-compose.yml describes all of them — images, ports, volumes, and the network linking them — as one file, so `docker compose up` starts the entire stack with one command instead of a series of manual docker run commands typed in the right order.',
   'A volume persists data outside a container''s lifecycle; docker-compose describes a whole multi-container stack as one file.', 1,
   'Why use a volume instead of just writing data inside the container?', '["Volumes are required for a container to start", "A container''s own filesystem is deleted with the container — a volume persists data outside it", "Volumes make the image smaller", "There is no difference"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'What is the most fundamental difference between a container and a VM?', '["Containers cost more to run", "A container shares the host kernel instead of virtualizing a full OS", "VMs start faster than containers", "Containers cannot run on Linux"]'::jsonb, 'single', 1, 0),
  (v_course_id, 'What does a Dockerfile''s CMD instruction define?', '["What runs when a container starts from the built image", "The base image to build from", "Which files get copied into the image", "The image''s tag name"]'::jsonb, 'single', 0, 1),
  (v_course_id, 'A container is stopped and removed. What happens to data it wrote to a mounted volume?', '["It is deleted along with the container", "It persists, since a volume lives outside the container''s lifecycle", "It moves to a random other container", "Volumes only work for read-only data"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'What problem does docker-compose solve?', '["It replaces the need for a Dockerfile", "It describes and starts a whole multi-container application from one file instead of many manual commands", "It makes images smaller", "It is required for any container to run"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;
end $$;
