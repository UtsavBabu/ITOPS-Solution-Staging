-- my_cybersachet_assignments() only ever returned course_id/assigned_at/
-- due_at — fine once a member has enrolled (the enrollment row carries its
-- own course_title), but a freshly assigned, not-yet-started course has no
-- enrollment row at all, so the Employee Portal dashboard had literally no
-- title to show and fell back to the word "Course" for every one of them.

drop function if exists my_cybersachet_assignments();

create function my_cybersachet_assignments()
returns table (course_id uuid, course_title text, assigned_at timestamptz, due_at timestamptz)
language sql security definer stable set search_path = public, pg_temp as $$
  select a.course_id, c.title, a.assigned_at, a.due_at
  from cybersachet_assignments a
  join cybersachet_courses c on c.id = a.course_id
  where a.user_id = auth.uid();
$$;
grant execute on function my_cybersachet_assignments() to authenticated;
