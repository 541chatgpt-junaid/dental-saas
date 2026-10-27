import { unstable_cache, revalidateTag } from "next/cache";
import { adminClient } from "@/lib/superAdmin";

/**
 * Server-side cache for /api/my-clinic. Two small entries, each with its own tag
 * so an edit can expire exactly what it changed (Next's data cache is shared
 * across server instances, so expiry is global, not per-instance):
 *
 *   user:<id>   → which clinic the user belongs to (rarely changes, short TTL)
 *   clinic:<id> → the clinic's display name      (expired the moment it is edited)
 *
 * Only successful lookups are cached: a miss throws inside the cached function,
 * and Next does not cache a throw — so a user who has not finished clinic setup
 * is never pinned to "no clinic".
 */
const USER_TTL = 60;    // seconds
const CLINIC_TTL = 300; // seconds, and expired immediately on any clinic edit

export const userTag = (userId: string) => `clinic-user:${userId}`;
export const clinicTag = (clinicId: string) => `clinic:${clinicId}`;

class NotFound extends Error {}

export async function getClinicForUser(userId: string): Promise<{ clinicId: string; clinicName: string | null } | null> {
  try {
    const clinicId = await unstable_cache(
      async () => {
        const { data } = await adminClient().from("staff").select("clinic_id").eq("user_id", userId).maybeSingle();
        if (!data?.clinic_id) throw new NotFound();
        return data.clinic_id as string;
      },
      ["my-clinic-user", userId],
      { tags: [userTag(userId)], revalidate: USER_TTL },
    )();

    const clinicName = await unstable_cache(
      async () => {
        const { data } = await adminClient().from("clinics").select("name").eq("id", clinicId).maybeSingle();
        if (!data) throw new NotFound();
        return (data.name as string | null) ?? null;
      },
      ["my-clinic-name", clinicId],
      { tags: [clinicTag(clinicId)], revalidate: CLINIC_TTL },
    )().catch(e => { if (e instanceof NotFound) return null; throw e; });

    return { clinicId, clinicName };
  } catch (e) {
    if (e instanceof NotFound) return null;
    throw e;
  }
}

/** Expire a clinic's cached name immediately (call after any clinic edit) */
export function invalidateClinic(clinicId: string) { revalidateTag(clinicTag(clinicId), { expire: 0 }); }
/** Expire a user's cached clinic mapping immediately (call after staff changes) */
export function invalidateUser(userId: string) { revalidateTag(userTag(userId), { expire: 0 }); }
