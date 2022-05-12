import { action } from 'typesafe-actions'

import { FriendshipAction } from 'shared/types'

import { FriendsState } from './types'
import { SocialAPI } from 'dcl-social-client'

export const UPDATE_FRIENDSHIP = 'Update friendship'
export const updateFriendship = (_action: FriendshipAction, userId: string, incoming: boolean) =>
  action(UPDATE_FRIENDSHIP, { action: _action, userId }, { incoming })
export type UpdateFriendship = ReturnType<typeof updateFriendship>

export const SET_MATRIX_CLIENT = '[CHAT] Set Matrix client'
export const setMatrixClient = (socialApi: SocialAPI) => action(SET_MATRIX_CLIENT, { socialApi })
export type SetMatrixClient = ReturnType<typeof setMatrixClient>

export const UPDATE_PRIVATE_MESSAGING = 'Update private messaging state'
export const updatePrivateMessagingState = (state: FriendsState) => action(UPDATE_PRIVATE_MESSAGING, state)
export type UpdatePrivateMessagingState = ReturnType<typeof updatePrivateMessagingState>

export const UPDATE_USER_DATA = 'Update user data'
export const updateUserData = (userId: string, socialId: string, conversationId?: string) =>
  action(UPDATE_USER_DATA, { userId, socialId, conversationId })
export type UpdateUserData = ReturnType<typeof updateUserData>
