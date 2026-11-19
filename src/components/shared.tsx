"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { COUNTRIES, DEPARTMENTS, courseMeta } from "@/lib/catalog";
import type { Course, Profile } from "@/lib/types";

export function Paw({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="16.5" rx="5.2" ry="4.3" />
      <ellipse cx="5" cy="10.5" rx="2.1" ry="2.7" />
      <ellipse cx="9.3" cy="6" rx="2.1" ry="2.8" />
      <ellipse cx="14.7" cy="6" rx="2.1" ry="2.8" />
      <ellipse cx="19" cy="10.5" rx="2.1" ry="2.7" />
    </svg>
  );
}
export const Arrow = () => <span aria-hidden="true">↗</span>;
export const number = (n: number) => n.toLocaleString("ko-KR");
export const date = (value: string) =>
  new Date(value).getTime()
    ? new Date(value).toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "첫 집계 대기 중";
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했어요.");
  return data;
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const old = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modalWide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modalHead">
        <div>
          <span className="eyebrow">교냥픽</span>
          <h2 id="modal-title">{title}</h2>
        </div>
        <button className="iconButton" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="emptyPaw">
        <Paw size={32} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function ProfileFields({
  value,
  onChange,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
}) {
  const names = new Intl.DisplayNames(["ko"], { type: "region" });
  return (
    <div className="formGrid">
      <label>
        이번 학기 학년
        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}학년
            </option>
          ))}
        </select>
      </label>
      <label>
        학과
        <select
          value={value.department}
          onChange={(e) => onChange({ ...value, department: e.target.value })}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <label>
        국적
        <select
          value={value.nationality}
          onChange={(e) => onChange({ ...value, nationality: e.target.value })}
        >
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {names.of(code)}
            </option>
          ))}
        </select>
      </label>
      <label>
        유학생 여부
        <select
          value={String(value.international)}
          onChange={(e) =>
            onChange({ ...value, international: e.target.value === "true" })
          }
        >
          <option value="false">해당 없음</option>
          <option value="true">외국인 유학생</option>
        </select>
      </label>
      <p className="muted small span2">
        학번은 받지 않습니다. 학과·학년·국적은 수강 제한 확인에만 사용해요.
      </p>
    </div>
  );
}
export function CourseCard({
  course,
  favorite,
  onFavorite,
  reason,
  children,
}: {
  course: Course;
  favorite: boolean;
  onFavorite: () => void;
  reason?: string;
  children?: ReactNode;
}) {
  return (
    <article className="courseCard">
      <div className="courseTop">
        <div className="tagRow">
          <span className="tag">{course.kind}</span>
          <span className="muted small">{course.area}</span>
        </div>
        <button
          className={`star ${favorite ? "starred" : ""}`}
          onClick={onFavorite}
          aria-label={`${course.name} 즐겨찾기 ${favorite ? "해제" : "추가"}`}
          aria-pressed={favorite}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>
      <h3>{course.name}</h3>
      <p className="courseMeta">{courseMeta(course)}</p>
      {reason && (
        <p className="reason">
          <Paw size={15} />
          {reason}
        </p>
      )}
      {["e-러닝 C", "e-러닝 D"].includes(course.kind) && (
        <p className="small warningText">
          학점교류 e-러닝 C·D는 학기당 합계 1강좌까지 추천해요.
        </p>
      )}
      {children}
    </article>
  );
}
export function Choice({
  values,
  value,
  onChange,
}: {
  values: [string | number, string][];
  value: string | number;
  onChange: (n: string | number) => void;
}) {
  return (
    <div className="choices">
      {values.map(([n, label]) => (
        <button
          type="button"
          key={n}
          className={`choice ${value === n ? "selected" : ""}`}
          aria-pressed={value === n}
          onClick={() => onChange(n)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
export function ProfileEditor({
  value,
  busy,
  onSave,
}: {
  value: Profile;
  busy: boolean;
  onSave: (p: Profile) => Promise<void>;
}) {
  const [profile, setProfile] = useState(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(profile);
      }}
    >
      <ProfileFields value={profile} onChange={setProfile} />
      <button className="button primary full" disabled={busy}>
        저장하기
      </button>
    </form>
  );
}
