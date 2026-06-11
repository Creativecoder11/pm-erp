"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { useSocket } from "@/hooks/useSocket"
import type { INotification } from "@/types"

export function useNotifications() {
  const [notifications, setNotifications] = useState<INotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await axios.get("/api/notifications", { params: { limit: 10 } })
      setNotifications(res.data.data)
      setUnreadCount(res.data.unreadCount)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await axios.put(`/api/notifications/${id}/read`)
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    await axios.put("/api/notifications/read-all")
  }, [])

  const addNotification = useCallback((notification: INotification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 10))
    setUnreadCount((prev) => prev + 1)
  }, [])

  const socket = useSocket()

  useEffect(() => {
    if (!socket) return

    socket.on("notification:new", addNotification)
    return () => {
      socket.off("notification:new", addNotification)
    }
  }, [socket, addNotification])

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  }
}
