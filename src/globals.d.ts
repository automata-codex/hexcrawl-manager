declare module 'rehype-add-classes';

declare global {
  interface CustomJwtSessionClaims {
    clearance?: string
  }

  interface JwtPayload {
    clearance?: string
  }
}
