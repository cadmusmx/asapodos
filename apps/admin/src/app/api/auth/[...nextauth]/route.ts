import NextAuth from 'next-auth'
import { authOptions } from '@gaso/shared'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
