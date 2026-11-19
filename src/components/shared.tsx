"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { COUNTRIES, DEPARTMENTS } from "@/lib/catalog";
import type { Profile } from "@/lib/types";

export function Paw({
  size = 22,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
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
export function Lock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" role="img" aria-label="잠김">
      <rect
        x="3"
        y="7"
        width="10"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
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
  eyebrow,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
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
          {eyebrow && <span className="modalEyebrow">{eyebrow}</span>}
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
      <Paw size={32} color="#BAD6EB" />
      <strong>{title}</strong>
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
    <>
      <label className="field">
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
      <label className="field">
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
      <label className="field">
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
      <fieldset className="field">
        <legend>유학생 여부</legend>
        <div className="radioRow">
          {[
            [false, "해당 없음"],
            [true, "외국인 유학생"],
          ].map(([v, label]) => (
            <label
              key={String(v)}
              className={`radioBox ${value.international === v ? "on" : ""}`}
            >
              <input
                type="radio"
                name="international"
                checked={value.international === v}
                onChange={() => onChange({ ...value, international: !!v })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
export function Choice({
  values,
  value,
  onChange,
  pill = false,
}: {
  values: [string | number, string][];
  value: string | number;
  onChange: (n: string | number) => void;
  pill?: boolean;
}) {
  return (
    <div className="choices">
      {values.map(([n, label]) => (
        <button
          type="button"
          key={n}
          className={`${pill ? "pill" : "choice"} ${value === n ? "on" : ""}`}
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
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(profile);
      }}
    >
      <ProfileFields value={profile} onChange={setProfile} />
      <p className="note">
        학번은 받지 않습니다. 학과·학년·국적은 수강 제한 확인에만 사용해요.
      </p>
      <button className="btn primary full" disabled={busy}>
        저장하기
      </button>
    </form>
  );
}
