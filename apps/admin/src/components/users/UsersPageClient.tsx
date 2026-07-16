'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import type { PlatformUserRow, PlatformRole } from '@/types/apps/platformUserTypes'
import UsersTable from '@/components/users/UsersTable'
import UsersFilters from '@/components/users/UsersFilters'
import UserCreateModal from '@/components/users/UserCreateModal'
import UserRemoveModal from '@/components/users/UserRemoveModal'
import EditUserModal from '@/components/users/EditUserModal'
import DeactivateUserModal from '@/components/users/DeactivateUserModal'
import ActivateUserModal from '@/components/users/ActivateUserModal'
import DeleteUserModal from '@/components/users/DeleteUserModal'

interface UsersPageClientProps {
  users: PlatformUserRow[]
  total: number
  page: number
  pageSize: number
  role: PlatformRole | null
  search: string | null
  oldestUserId: number | null
}

export default function UsersPageClient({
  users,
  total,
  page,
  pageSize,
  role,
  search,
  oldestUserId
}: UsersPageClientProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const [selectedUser, setSelectedUser] = useState<PlatformUserRow | null>(null)

  const handleEdit = (user: PlatformUserRow) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const handleRemove = (user: PlatformUserRow) => {
    setSelectedUser(user)
    setRemoveModalOpen(true)
  }

  const handleDeactivate = (user: PlatformUserRow) => {
    setSelectedUser(user)
    setDeactivateModalOpen(true)
  }

  const handleActivate = (user: PlatformUserRow) => {
    setSelectedUser(user)
    setActivateModalOpen(true)
  }

  const handleDelete = (user: PlatformUserRow) => {
    setSelectedUser(user)
    setDeleteModalOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h4' fontWeight='bold'>
          Gestión de Usuarios
        </Typography>
        <Button variant='contained' onClick={() => setCreateModalOpen(true)}>
          + Crear Usuario
        </Button>
      </Box>

      <UsersFilters />

      <UsersTable
        users={users}
        total={total}
        page={page}
        pageSize={pageSize}
        role={role}
        search={search}
        oldestUserId={oldestUserId}
        onEdit={handleEdit}
        onRemove={handleRemove}
        onDelete={handleDelete}
        onDeactivate={handleDeactivate}
        onActivate={handleActivate}
      />

      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <UserRemoveModal
        open={removeModalOpen}
        onClose={() => { setRemoveModalOpen(false); setSelectedUser(null) }}
        user={selectedUser}
      />

      <EditUserModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedUser(null) }}
        user={selectedUser}
      />

      <DeactivateUserModal
        open={deactivateModalOpen}
        onClose={() => { setDeactivateModalOpen(false); setSelectedUser(null) }}
        user={selectedUser}
      />

      <ActivateUserModal
        open={activateModalOpen}
        onClose={() => { setActivateModalOpen(false); setSelectedUser(null) }}
        user={selectedUser}
      />

      <DeleteUserModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setSelectedUser(null) }}
        user={selectedUser}
      />
    </Box>
  )
}
