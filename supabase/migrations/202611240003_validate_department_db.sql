-- Enforce allowed DEPARTMENTS list on public.profiles at the database level.

alter table public.profiles
  drop constraint if exists profiles_department_check,
  add constraint profiles_department_check check (
    department in (
      '국어국문학과',
      '영어영문학과',
      '사학과',
      '경영학부',
      '경제금융학부',
      '컴퓨터소프트웨어학부',
      '정보시스템학과',
      '전자공학부',
      '기계공학부',
      '건축학부',
      '간호학부',
      '정책학과',
      '체육학과',
      '기타'
    )
  );
