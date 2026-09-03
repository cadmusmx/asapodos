// Third-party Imports
import { configureStore } from '@reduxjs/toolkit'

export const store = configureStore({
  reducer: {
    _placeholder: (state: Record<string, unknown> | null = null) => state
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
