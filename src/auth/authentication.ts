// auth/authentication.ts
import { Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { verifyAccessToken, normalizeLevel, verifyRefreshToken } from "../utils/jwtHelper";

// Define the decoded token type
interface DecodedToken {
  id: string;
  email: string;
  role: string;
  type?: string;
  level?: string;
  deviceId?: string;
  organizationId?: string;
  progressId?: string;
  planId?: string;
  settingsId?: string;
  [key: string]: any;
}

// Helper function to set secure cookies
const setSecureCookie = (res: any, name: string, value: string, maxAge: number) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: maxAge
  });
};

// Helper function to generate new tokens and session from refresh token
const regenerateFromRefreshToken = async (refreshToken: string, deviceId: string, request: Request) => {
  try {
    // Verify refresh token with type assertion
    const decodedRefresh = verifyRefreshToken(refreshToken) as DecodedToken | null;
    if (!decodedRefresh || !decodedRefresh.id) {
      console.error("❌ Invalid refresh token format or missing id");
      return null;
    }

    console.log(`🔄 Found refresh token for user: ${decodedRefresh.id}`);

    // Get user from database (without include since relations might not exist)
    const user = await prisma.user.findUnique({
      where: { id: decodedRefresh.id },
    });

    if (!user) {
      console.error("❌ User not found for refresh token");
      return null;
    }

    console.log(`✅ User found: ${user.email_address}`);

    // Fetch related data separately
    let userOrganization = null;
    let userProgress = null;
    let userSetting = null;
    let userPricingHistory = null;

    try {
      // Try to get organization if it exists
      const organization = await prisma.organization.findFirst({
        where: { userId: user.id }
      });
      if (organization) userOrganization = organization;
    } catch (error) {
      console.log("No organization relation found");
    }

    try {
      // Try to get progress if it exists
      const progress = await prisma.progress.findFirst({
        where: { userId: user.id }
      });
      if (progress) userProgress = progress;
    } catch (error) {
      console.log("No progress relation found");
    }

    try {
      // Try to get settings if it exists
      const settings = await prisma.settings.findFirst({
        where: { userId: user.id }
      });
      if (settings) userSetting = settings;
    } catch (error) {
      console.log("No settings relation found");
    }

    try {
      // Try to get pricing history if it exists
      const pricingHistory = await prisma.pricingHistory.findFirst({
        where: { userId: user.id },
        orderBy: { planActivatedAt: 'desc' }
      });
      if (pricingHistory) userPricingHistory = pricingHistory;
    } catch (error) {
      console.log("No pricingHistory relation found");
    }

    // Get or create device info
    const deviceType = request.headers["user-agent"] ? "web" : "unknown";
    
    // Determine user type
    const userType = decodedRefresh.type || 
                     (userOrganization ? "ORGANIZATION" : 
                      user.userType ? "INVITED_USER" : "USER");

    // Normalize level
    const normalizedLevel = normalizeLevel(user.level || "Beginners");

    // Prepare payload for new tokens
    const payload: any = {
      id: user.id,
      email: user.email_address,
      role: user.role,
      deviceId: deviceId,
      level: normalizedLevel,
      deviceType: deviceType,
      type: userType,
    };

    // Add organization data if exists
    if (userOrganization) {
      payload.organizationId = userOrganization.id;
      payload.userId = user.id;
      payload.organization_name = userOrganization.organization_name;
    }

    // Add progress data for regular users
    if (userProgress && userProgress.id) {
      payload.progressId = userProgress.id;
    }
    
    // Add pricing history data
    if (userPricingHistory && userPricingHistory.id) {
      payload.planId = userPricingHistory.id;
    }
    
    // Add settings data
    if (userSetting && userSetting.id) {
      payload.settingsId = userSetting.id;
    }

    // Generate a new access token only. The refresh token passed in was just
    // verified as valid above, so it's reused as-is — this function used to
    // also mint and store a brand-new refresh token on every call, but that
    // raced with the explicit POST /api/verify/refresh-token endpoint (which
    // only ever reissues the access token, never rotates the refresh token).
    // A freshly loaded dashboard fires many parallel bearerAuth-guarded
    // requests at once; if more than one hit this "no valid access token"
    // path concurrently, each minted a *different* new refresh token and
    // overwrote the same session row — last write wins in the DB, but the
    // client only ever received whichever cookie the browser applied last,
    // so it frequently ended up holding a refresh token that no longer
    // matched storage. The next explicit refresh call's exact-string lookup
    // then found nothing and returned 403 "Invalid session", which the
    // client treats as an expired session and bounces to login — right
    // after a successful login, since that's exactly when a dashboard fires
    // its burst of parallel requests. Reusing the same refresh token here
    // removes the only place that rotated it outside that one endpoint, so
    // there's nothing left to race.
    const newAccessToken = jwt.sign(payload, process.env.ACCESS_SECRET!, { expiresIn: "15m" });

    // Create or update session atomically on the unique deviceId column.
    // Doing this as separate findFirst + create/update calls (the old code)
    // let two near-simultaneous requests both see "no session" and both try
    // to create one, tripping the unique constraint on deviceId — and a
    // revoked session row for the same deviceId caused the exact same
    // create-time failure even with no concurrency at all, since findFirst
    // filtered isRevoked:false but the unique constraint doesn't. upsert
    // keyed on deviceId is a single atomic DB operation, so neither race
    // exists.
    const session = await prisma.userSession.upsert({
      where: { deviceId: deviceId },
      create: {
        userId: user.id,
        deviceId: deviceId,
        accessToken: newAccessToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActive: new Date(),
        isRevoked: false,
        deviceType: deviceType,
        userType: userType,
      },
      update: {
        userId: user.id,
        accessToken: newAccessToken,
        lastActive: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        deviceType: deviceType,
        userType: userType,
      }
    });
    console.log(`✅ Session upserted for user: ${user.id}`);

    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken,
      user: user,
      decoded: payload
    };
    
  } catch (error) {
    console.error("❌ Error regenerating from refresh token:", error);
    return null;
  }
};

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[],
): Promise<any> {
  if (securityName === "bearerAuth") {
    // An explicit Authorization header WINS over the cookie. This used to be
    // the other way round, and it silently broke every native client:
    // React Native's fetch keeps a native cookie jar, so the Set-Cookie
    // headers we send on login get stored on the device too. The app then
    // sends both its fresh AsyncStorage token (header) and whatever stale
    // cookie the jar still holds — and we picked the cookie. Clearing the
    // app's stored session doesn't touch that jar, so a stale cookie token
    // outlived every logout and kept failing signature verification
    // ("invalid signature") while the header token beside it was perfectly
    // valid. A client that bothers to send a bearer token is telling us which
    // credential to use; honour that.
    const tokenFromHeader = request.headers["authorization"]?.split(" ")[1];
    let accessToken = tokenFromHeader || request.cookies?.accessToken;
    // Same precedence for the refresh token — mobile sends it as a header
    // since it has no cookie it can trust.
    const refreshToken =
      (request.headers["x-refresh-token"] as string | undefined) || request.cookies?.refreshToken;
    const deviceId = request.headers["x-device-id"] || request.cookies?.deviceId || `device_${Date.now()}_${Math.random()}`;

    console.log("🔐 Authentication check:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      deviceId: deviceId,
      path: request.path
    });

    // CASE 1: No access token - try to generate from refresh token
    if (!accessToken) {
      console.log("🔄 No access token, attempting to generate from refresh token...");
      
      if (!refreshToken) {
        console.error("❌ No refresh token available");
        throw new Error("No access token or refresh token provided");
      }

      // Try to regenerate from refresh token
      const regenerated = await regenerateFromRefreshToken(refreshToken, deviceId, request);
      
      if (regenerated && request.res) {
        // Set new cookies
        setSecureCookie(request.res, "accessToken", regenerated.accessToken, 15 * 60 * 1000);
        setSecureCookie(request.res, "refreshToken", regenerated.refreshToken, 7 * 24 * 60 * 60 * 1000);
        setSecureCookie(request.res, "deviceId", deviceId, 365 * 24 * 60 * 60 * 1000);
        
        accessToken = regenerated.accessToken;
        
        // Attach user and org to request
        (request as any).user = regenerated.user;
        (request as any).deviceId = deviceId;
        
        if (regenerated.decoded.organizationId) {
          const organization = await prisma.organization.findUnique({
            where: { id: regenerated.decoded.organizationId },
          });
          if (organization) {
            (request as any).org = organization;
          }
        }
        
        console.log("✅ Successfully generated new tokens from refresh token!");
        return regenerated.decoded;
      } else {
        console.error("❌ Failed to generate tokens from refresh token");
        throw new Error("Unable to authenticate: Please login again");
      }
    }

    // CASE 2: Have access token - verify it
    let decoded: DecodedToken | null = null;
    try {
      decoded = verifyAccessToken(accessToken) as DecodedToken | null;
      if (!decoded || !decoded.id) {
        console.log("⚠️ Access token invalid, attempting to refresh...");
        
        // Try to refresh using refresh token
        if (refreshToken) {
          const regenerated = await regenerateFromRefreshToken(refreshToken, deviceId, request);
          
          if (regenerated && request.res) {
            setSecureCookie(request.res, "accessToken", regenerated.accessToken, 15 * 60 * 1000);
            setSecureCookie(request.res, "refreshToken", regenerated.refreshToken, 7 * 24 * 60 * 60 * 1000);
            
            accessToken = regenerated.accessToken;
            decoded = regenerated.decoded as DecodedToken;
            
            (request as any).user = regenerated.user;
            (request as any).deviceId = deviceId;
            
            if (regenerated.decoded.organizationId) {
              const organization = await prisma.organization.findUnique({
                where: { id: regenerated.decoded.organizationId },
              });
              if (organization) {
                (request as any).org = organization;
              }
            }
            
            console.log("✅ Successfully refreshed expired token!");
          } else {
            throw new Error("Invalid refresh token");
          }
        } else {
          throw new Error("No refresh token available");
        }
      }
    } catch (error) {
      console.error("❌ Token verification failed:", error);
      throw new Error("Invalid or expired token");
    }

    // Ensure we have a valid decoded token at this point
    if (!decoded || !decoded.id) {
      throw new Error("Invalid token payload");
    }

    // CASE 3: Ensure level is present
    if (!decoded.level) {
      console.log("⚠️ Token missing level, fetching from database...");
      
      const userFromDb = await prisma.user.findUnique({
        where: { id: decoded.id },
      });
      
      if (userFromDb?.level) {
        const normalizedLevel = normalizeLevel(userFromDb.level);
        decoded.level = normalizedLevel;
        
        // Generate new token with level
        const newAccessToken = jwt.sign(
          { ...decoded },
          process.env.ACCESS_SECRET!,
          { expiresIn: "15m" }
        );
        
        if (request.res) {
          setSecureCookie(request.res, "accessToken", newAccessToken, 15 * 60 * 1000);
        }
        
        console.log(`✅ Token updated with level: ${normalizedLevel}`);
      } else {
        decoded.level = "Beginners";
        console.log(`⚠️ Set default level: Beginners`);
      }
    }

    // CASE 4: Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      console.error("❌ User not found in database");
      throw new Error("User not found");
    }

    // CASE 5: Ensure session exists — upsert on the unique deviceId so two
    // concurrent requests (e.g. /profile and /discussion/private/unread/count
    // fired back-to-back right after login) can't both see "no session" and
    // both try to create one, which trips deviceId's unique constraint and
    // surfaces as a 500 "Unique constraint failed" on a plain GET. A revoked
    // session row for the same deviceId caused the identical failure with no
    // concurrency at all, since the old findFirst filtered isRevoked:false
    // while the unique constraint doesn't care about that flag.
    await prisma.userSession.upsert({
      where: { deviceId: deviceId },
      create: {
        userId: user.id,
        deviceId: deviceId,
        accessToken: accessToken,
        refreshToken: refreshToken || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActive: new Date(),
        isRevoked: false,
        deviceType: request.headers["user-agent"] ? "web" : "unknown",
        userType: decoded.type || "USER",
      },
      update: {
        lastActive: new Date(),
        accessToken: accessToken,
        isRevoked: false,
      }
    });

    // Attach data to request
    (request as any).user = user;
    (request as any).deviceId = deviceId;

    if (decoded.progressId) {
      (request as any).progressId = decoded.progressId;
    }
    if (decoded.planId) {
      (request as any).planId = decoded.planId;
    }

    // Attach organization if exists
    if (decoded.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: decoded.organizationId },
      });
      if (organization) {
        (request as any).org = organization;
      }
    }

    // Update user online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastActive: new Date() },
    });

    console.log(`✅ Authentication successful for user: ${user.id} (${user.email_address})`);
    
    return decoded;
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}