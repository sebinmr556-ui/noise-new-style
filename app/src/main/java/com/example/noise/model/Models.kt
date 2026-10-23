package com.example.noise.model

data class AppUser(
    val uid: String,
    val displayName: String,
    val username: String,
    val email: String? = null,
    val photoURL: String,
    val bio: String = "",
    val website: String = "",
    val followersCount: Int = 120,
    val followingCount: Int = 45,
    val isVerified: Boolean = false,
    val coinsBalance: Int = 250,
    val following: List<String> = listOf("maya_beats", "alex_codes")
)

data class PublicUserProfile(
    val uid: String,
    val userId: String,
    val username: String,
    val displayName: String,
    val avatar: String,
    val bio: String = "",
    val website: String = "",
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val isVerified: Boolean = false,
    val isPrivate: Boolean = false
)

data class CommentItem(
    val id: String,
    val uid: String,
    val username: String,
    val avatar: String,
    val text: String,
    val createdAt: String,
    val isVerified: Boolean = false
)

data class Post(
    val id: String,
    val uid: String,
    val username: String,
    val avatar: String,
    val image: String,
    val caption: String,
    val location: String? = null,
    val filter: String = "Normal",
    val likes: Int = 0,
    val likedBy: List<String> = emptyList(),
    val savedBy: List<String> = emptyList(),
    val comments: List<CommentItem> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val isVerified: Boolean = false
)

data class Story(
    val id: String,
    val uid: String,
    val username: String,
    val avatar: String,
    val mediaUrl: String,
    val caption: String? = null,
    val timestamp: String = "2h",
    val hasSeen: Boolean = false,
    val isVerified: Boolean = false
)

data class Reel(
    val id: String,
    val username: String,
    val avatar: String,
    val videoUrl: String,
    val posterUrl: String,
    val caption: String,
    val musicTitle: String,
    val likes: Int,
    val commentsCount: Int,
    val isLiked: Boolean = false
)

data class RoomParticipant(
    val uid: String,
    val username: String,
    val displayName: String,
    val avatar: String = "",
    val isHost: Boolean = false,
    val isSpeaker: Boolean = false,
    val isMuted: Boolean = false,
    val isSpeaking: Boolean = false,
    val hasRaisedHand: Boolean = false,
    val seatNumber: Int = 0,
    val likesReceived: Int = 0
)

data class RoomMessage(
    val id: String,
    val uid: String,
    val username: String,
    val displayName: String = "",
    val avatar: String = "",
    val text: String,
    val createdAt: Long = System.currentTimeMillis()
)

data class PKBattle(
    val isActive: Boolean = false,
    val teamRedScore: Int = 120,
    val teamBlueScore: Int = 85,
    val timeLeftSeconds: Int = 45,
    val teamRedUser: String = "maya_beats",
    val teamBlueUser: String = "kai_dj"
)

data class VoiceRoom(
    val id: String,
    val title: String,
    val topic: String,
    val hostUid: String,
    val hostUsername: String,
    val hostDisplayName: String,
    val hostAvatar: String,
    val speakers: List<RoomParticipant> = emptyList(),
    val listeners: List<RoomParticipant> = emptyList(),
    val tags: List<String> = emptyList(),
    val ambientVibe: String = "lofi",
    val isLive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val slotLikes: Map<Int, Int> = emptyMap(),
    val pkBattle: PKBattle? = null
)

data class DirectMessageItem(
    val id: String,
    val senderId: String,
    val senderUsername: String,
    val text: String,
    val time: String,
    val isMe: Boolean,
    val read: Boolean = true
)

data class DirectMessageContact(
    val id: String,
    val name: String,
    val username: String,
    val avatar: String,
    val lastMessage: String,
    val time: String,
    val unread: Boolean = false,
    val unreadCount: Int = 0,
    val online: Boolean = false
)

data class NotificationItem(
    val id: String,
    val title: String,
    val description: String,
    val time: String,
    val avatar: String,
    val type: String // "like", "comment", "room", "follow"
)

enum class NavTab {
    HOME, EXPLORE, UPLOAD, REELS, PROFILE
}
