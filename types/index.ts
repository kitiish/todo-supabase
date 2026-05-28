export interface Todo {
  id: number
  created_at: string
  title: string
  is_complete: boolean
  is_priority: boolean
  user_id: string
  due_date: string | null
}
