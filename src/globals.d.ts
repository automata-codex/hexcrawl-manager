declare module 'rehype-add-classes';

declare global {
  interface CustomJwtSessionClaims {
    firstName?: string
    primaryEmail?: string
    metadata: {
      onboardingComplete?: boolean
    }
  }
  interface JwtPayload {
    clearance?: string
  }
}
