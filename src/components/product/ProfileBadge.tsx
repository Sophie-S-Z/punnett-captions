"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function ProfileBadge({ name, photo }: { name: string; photo: string | null }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  return <Link className="profile-badge" href="/profile" aria-label={`${name}, edit profile`}>
    <span className="header-avatar" aria-hidden="true">
      {photo && failedPhoto !== photo ? <Image src={photo} alt="" width={40} height={40} unoptimized onError={() => setFailedPhoto(photo)} /> : name.slice(0, 1).toUpperCase()}
    </span>
    <span className="profile-badge-name">{name}</span>
  </Link>;
}
