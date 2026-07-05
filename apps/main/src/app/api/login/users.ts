// ** Fake user data and data type

// ** Please remove below user data and data type in production and verify user with Real Database

export type UserTable = {
  id: number
  tenant: string
  name: string
  email: string
  image: string
  password: string
  mfaRequired: boolean
  mfaType: 'TOTP' | 'SMS'
  totpSecret: string
}

// =============== Fake Data ============================

export const users: UserTable[] = [
  {
    id: 1,
    tenant: 'gaso',
    name: 'Angel Aceves',
    password: 'admin',
    email: 'admin@materio.com',
    image: '/images/avatars/1.png',
    mfaRequired: true,
    mfaType: 'TOTP',
    totpSecret: 'JBSWY3DPEHPK3PXP'
  }
]
