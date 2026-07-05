// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import 'next-auth/jwt'

import { prisma } from '../prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  // ** Configure one or more authentication providers
  // ** Please refer to https://next-auth.js.org/configuration/options#providers for more `providers` options
  providers: [
    CredentialProvider({
      // ** The name to display on the sign in form (e.g. 'Sign in with...')
      // ** For more details on Credentials Provider, visit https://next-auth.js.org/providers/credentials
      name: 'Credentials',
      type: 'credentials',

      /*
       * As we are using our own Sign-in page, we do not need to change
       * username or password attributes manually in following credentials object.
       */
      credentials: {},
      async authorize(credentials) {
        const { user, password, challengeId, mfaCode, loginType } = credentials as {
          user: string
          password: string
          challengeId?: string
          mfaCode?: string
          loginType?: string
        }

        try {
          const isAdminLogin = loginType === 'admin'
          const loginUrl = isAdminLogin
            ? `${process.env.API_URL}/admin/login`
            : `${process.env.API_URL}/login`

          const res = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: user,
              password,
              challengeId,
              mfaCode
            })
          })

          const data = await res.json()

          if (res.status === 401 || res.status === 403) {
            throw new Error(JSON.stringify(data))
          }

          if (res.status === 200) {
            return data
          }

          return null
        } catch (e: any) {
          throw new Error(e.message)
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
    })

    // ** ...add more providers here
  ],

  // ** Please refer to https://next-auth.js.org/configuration/options#session for more `session` options
  session: {
    /*
     * Choose how you want to save the user session.
     * The default is `jwt`, an encrypted JWT (JWE) stored in the session cookie.
     * If you use an `adapter` however, NextAuth default it to `database` instead.
     * You can still force a JWT session by explicitly defining `jwt`.
     * When using `database`, the session cookie will only contain a `sessionToken` value,
     * which is used to look up the session in the database.
     * If you use a custom credentials provider, user accounts will not be persisted in a database by NextAuth.js (even if one is configured).
     * The option to use JSON Web Tokens for session tokens must be enabled to use a custom credentials provider.
     */
    strategy: 'jwt',

    // ** Seconds - How long until an idle session expires and is no longer valid
    maxAge: 30 * 24 * 60 * 60 // ** 30 days
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#pages for more `pages` options
  pages: {
    signIn: '/login'
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#callbacks for more `callbacks` options
  callbacks: {
    /*
     * While using `jwt` as a strategy, `jwt()` callback will be called before
     * the `session()` callback. So we have to add custom parameters in `token`
     * via `jwt()` callback to make them accessible in the `session()` callback
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwt: (async ({ token, user }: any) => {
      if (user) {
        token.id = user.id as number
        token.name = user.name
        token.email = user.email
        token.company = user.company
        token.profile = user.profile
        token.admin = user.admin
        token.area = user.area
        token.cityBase = user.IdBaseCiudad
        token.position = user.position
        token.region = user.region
        token.image = user.image
        token.tenantId = user.tenantId
        token.tenantSlug = user.tenantSlug
        token.tenantName = user.tenantName
        token.platformRole = user.platformRole ?? null
      }

      if (!user && token.tenantId) {
        const tenants = await prisma.$queryRaw<Array<{ isActive: number }>>`
          SELECT CAST(CASE WHEN Status IN ('ACTIVE', 'TRIAL') THEN 1 ELSE 0 END AS INT) AS isActive
          FROM Security.Tenants
          WHERE TenantID = CAST(${token.tenantId as string} AS uniqueidentifier)
        `
        if (!tenants[0]?.isActive) {
          return {}
        }
      }

      return token
    }) as any,
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as number
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.company = token.company as number
        session.user.profile = token.profile as number
        session.user.admin = token.admin as boolean
        session.user.area = token.area as number
        session.user.cityBase = token.cityBase as number
        session.user.position = token.position as number
        session.user.region = token.region as number
        session.user.image = token.image as string
        session.user.tenantId = (token.tenantId as string) ?? ''
        session.user.tenantSlug = (token.tenantSlug as string) ?? ''
        session.user.tenantName = (token.tenantName as string) ?? ''
        session.user.platformRole = (token.platformRole as 'super_admin' | 'support' | 'auditor' | null) ?? null
      }

      return session
    }
  }
}
