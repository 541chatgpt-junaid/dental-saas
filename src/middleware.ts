import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const pagePermissionMap: Record<string, string> = {
  "/dashboard/patients": "Patients",
  "/dashboard/appointments": "Appointments",
  "/dashboard/doctors": "Doctors",
  "/dashboard/labs": "Lab Records",
  "/dashboard/billing": "Billing",
  "/dashboard/materials": "Materials",
  "/dashboard/purchases": "Purchases",
  "/dashboard/expenses": "Expenses",
  "/dashboard/reports": "Reports",
  "/dashboard/staff": "Staff",
  "/dashboard/settings": "Settings",
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in — login page par bhejo
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const pathname = request.nextUrl.pathname;
    const requiredPermission = Object.entries(pagePermissionMap).find(
      ([key]) => pathname === key || pathname.startsWith(key + "/")
    )?.[1];

    if (requiredPermission) {
      // Staff table mein check karo
      const { data: staffRecord } = await supabase
        .from("staff")
        .select("permissions, status")
        .eq("user_id", user.id)
        .single();

      // Agar staff record hai (matlab yeh owner nahi, staff member hai)
      if (staffRecord) {
        // Inactive staff ko block karo
        if (staffRecord.status === "Inactive") {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        // Permission check
        const permissions = staffRecord.permissions
          ? staffRecord.permissions.split(",").map((p: string) => p.trim())
          : [];

        if (!permissions.includes(requiredPermission)) {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};