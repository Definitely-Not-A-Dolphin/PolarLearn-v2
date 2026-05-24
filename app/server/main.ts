// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { createTRPCRouter } from './trpc'

import { forumRouter } from './routers/forum'
import { ListRouter } from './routers/lists'
import { learningRouter } from './routers/learning'
import { groupsRouter } from './routers/groups'
import { searchRouter } from './routers/search'
import { notificationRouter } from './routers/notification'
import { adminRouter } from './routers/admin'

export const appRouter = createTRPCRouter({
  list: ListRouter,
  forum: forumRouter,
  learning: learningRouter,
  groups: groupsRouter,
  search: searchRouter,
  notification: notificationRouter,
  admin: adminRouter
})

export type AppRouter = typeof appRouter
