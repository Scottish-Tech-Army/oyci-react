import React from "react";

export default function Page({
  right,
  children,
}: {
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="page">
      <div className="pageHeader">
        <div>{right}</div>
      </div>
      {children}
    </section>
  );
}