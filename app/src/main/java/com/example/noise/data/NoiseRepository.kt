package com.example.noise.data

import com.example.noise.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class NoiseRepository {

    private val _currentUser = MutableStateFlow(
        AppUser(
            uid = "user-me",
            displayName = "Alex Rivera",
            username = "alex_rivera",
            email = "alex@noise.social",
            photoURL = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
            bio = "Sound explorer & visual storyteller 🎧✨ Building high-energy spaces.",
            website = "https://noise.social/@alex",
            followersCount = 582,
            followingCount = 142,
            coinsBalance = 250,
            following = listOf("maya_beats", "alex_codes", "kai_dj")
        )
    )
    val currentUser: StateFlow<AppUser> = _currentUser.asStateFlow()

    private val _posts = MutableStateFlow<List<Post>>(
        listOf(
            Post(
                id = "post-1",
                uid = "host-maya",
                username = "maya_beats",
                avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                image = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
                caption = "Late night studio session testing the new vintage analog synths 🎹 Ambient vibes heading to tonight's voice lounge! Drop your favorite track below.",
                location = "Neon Sound Studio, Berlin",
                filter = "Cyber",
                likes = 342,
                likedBy = listOf("user-me"),
                comments = listOf(
                    CommentItem("c-1", "kai_dj", "kai_dj", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80", "That Moog baseline is insane 🔥", "2h ago", true),
                    CommentItem("c-2", "alex_codes", "alex_codes", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", "Hyped for the live room later tonight!", "1h ago", true)
                ),
                createdAt = System.currentTimeMillis() - 7200000,
                isVerified = true
            ),
            Post(
                id = "post-2",
                uid = "host-dev",
                username = "alex_codes",
                avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
                image = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
                caption = "Built a real-time reactive audio visualizer in Jetpack Compose! The matrix of glowing nodes reacts to room frequency in under 12ms. 🚀⚡️",
                location = "San Francisco, CA",
                filter = "Clarendon",
                likes = 512,
                likedBy = emptyList(),
                comments = listOf(
                    CommentItem("c-3", "elena_lens", "elena_lens", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", "The color transitions look super clean!", "45m ago", true)
                ),
                createdAt = System.currentTimeMillis() - 14400000,
                isVerified = true
            ),
            Post(
                id = "post-3",
                uid = "user-elena",
                username = "elena_lens",
                avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
                image = "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
                caption = "Golden hour reflections across Tokyo city streets. The shadows tell stories the light tends to hide. 📸",
                location = "Shinjuku, Tokyo",
                filter = "Warm",
                likes = 890,
                likedBy = listOf("user-me"),
                comments = emptyList(),
                createdAt = System.currentTimeMillis() - 28800000,
                isVerified = true
            )
        )
    )
    val posts: StateFlow<List<Post>> = _posts.asStateFlow()

    private val _stories = MutableStateFlow<List<Story>>(
        listOf(
            Story(
                id = "story-1",
                uid = "host-maya",
                username = "maya_beats",
                avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                mediaUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
                caption = "Mixing new lofi chords before the live room begins 🎧",
                timestamp = "30m",
                hasSeen = false,
                isVerified = true
            ),
            Story(
                id = "story-2",
                uid = "host-dev",
                username = "alex_codes",
                avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
                mediaUrl = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
                caption = "Coffee + Code sprints all afternoon ☕️💻",
                timestamp = "1h",
                hasSeen = false,
                isVerified = true
            ),
            Story(
                id = "story-3",
                uid = "user-kai",
                username = "kai_dj",
                avatar = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
                mediaUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
                caption = "Stage rehearsal in London tonight! Big sound vibes.",
                timestamp = "3h",
                hasSeen = false,
                isVerified = true
            ),
            Story(
                id = "story-4",
                uid = "user-elena",
                username = "elena_lens",
                avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
                mediaUrl = "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
                caption = "Starry skies on Mount Fuji 🌌",
                timestamp = "5h",
                hasSeen = true,
                isVerified = true
            )
        )
    )
    val stories: StateFlow<List<Story>> = _stories.asStateFlow()

    private val _voiceRooms = MutableStateFlow<List<VoiceRoom>>(
        listOf(
            VoiceRoom(
                id = "room-lounge-1",
                title = "Late Night Chill & Lofi ☕️",
                topic = "Casual Hangout & Ambient Beats",
                hostUid = "host-maya",
                hostUsername = "maya_beats",
                hostDisplayName = "Maya Beats",
                hostAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                speakers = listOf(
                    RoomParticipant("host-maya", "maya_beats", "Maya Beats", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80", isHost = true, isSpeaker = true, isSpeaking = true, seatNumber = 0, likesReceived = 42),
                    RoomParticipant("user-kai", "kai_dj", "Kai Music", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80", isSpeaker = true, isSpeaking = false, seatNumber = 1, likesReceived = 28)
                ),
                listeners = listOf(
                    RoomParticipant("user-sam", "sam_travels", "Sam R.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80")
                ),
                tags = listOf("Music", "Lofi", "Chill"),
                ambientVibe = "lofi",
                slotLikes = mapOf(0 to 42, 1 to 28),
                pkBattle = PKBattle(isActive = true, teamRedScore = 154, teamBlueScore = 138, timeLeftSeconds = 42, teamRedUser = "maya_beats", teamBlueUser = "kai_dj")
            ),
            VoiceRoom(
                id = "room-founders-2",
                title = "Creators & Tech Talk 🚀",
                topic = "Building Mobile Apps with Compose",
                hostUid = "host-dev",
                hostUsername = "alex_codes",
                hostDisplayName = "Alex C.",
                hostAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
                speakers = listOf(
                    RoomParticipant("host-dev", "alex_codes", "Alex C.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", isHost = true, isSpeaker = true, isSpeaking = true, seatNumber = 0)
                ),
                listeners = listOf(
                    RoomParticipant("david_k", "david_k", "David Kim", "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80")
                ),
                tags = listOf("Tech", "Coding", "Founders"),
                ambientVibe = "synth",
                slotLikes = mapOf(0 to 65)
            )
        )
    )
    val voiceRooms: StateFlow<List<VoiceRoom>> = _voiceRooms.asStateFlow()

    private val _reels = MutableStateFlow<List<Reel>>(
        listOf(
            Reel(
                id = "reel-1",
                username = "maya_beats",
                avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-dj-mixing-music-at-a-club-41716-large.mp4",
                posterUrl = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
                caption = "Synth progression in 120bpm 🎧 Would you dance to this?",
                musicTitle = "Maya Beats • Cyber Euphoria (Original Mix)",
                likes = 1240,
                commentsCount = 89,
                isLiked = true
            ),
            Reel(
                id = "reel-2",
                username = "elena_lens",
                avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
                videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-timelapse-of-tokyo-shinjuku-cityscape-at-night-42861-large.mp4",
                posterUrl = "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
                caption = "Tokyo neon hyperlapse at 3am. The city never truly sleeps. 🏙️⚡️",
                musicTitle = "Neon Sound Collective • Midnight Rain",
                likes = 2890,
                commentsCount = 145,
                isLiked = false
            )
        )
    )
    val reels: StateFlow<List<Reel>> = _reels.asStateFlow()

    private val _directMessages = MutableStateFlow<List<DirectMessageContact>>(
        listOf(
            DirectMessageContact(
                id = "host-maya",
                name = "Maya Beats",
                username = "maya_beats",
                avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                lastMessage = "See you on the live stage tonight! 🎧",
                time = "10m ago",
                unread = true,
                unreadCount = 1,
                online = true
            ),
            DirectMessageContact(
                id = "host-dev",
                name = "Alex C.",
                username = "alex_codes",
                avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
                lastMessage = "I checked out the Compose code, super clean!",
                time = "1h ago",
                unread = false,
                unreadCount = 0,
                online = false
            ),
            DirectMessageContact(
                id = "user-kai",
                name = "Kai Music",
                username = "kai_dj",
                avatar = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
                lastMessage = "Let's do a PK Battle round in the lounge",
                time = "3h ago",
                unread = false,
                unreadCount = 0,
                online = true
            )
        )
    )
    val directMessages: StateFlow<List<DirectMessageContact>> = _directMessages.asStateFlow()

    private val _notifications = MutableStateFlow<List<NotificationItem>>(
        listOf(
            NotificationItem("notif-1", "Maya Beats liked your post", "Loved your recent studio snapshot!", "5m ago", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80", "like"),
            NotificationItem("notif-2", "Alex C. started a Voice Room", "Creators & Tech Talk 🚀 is live now", "15m ago", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", "room"),
            NotificationItem("notif-3", "Elena Lens started following you", "Street & portrait photographer", "1h ago", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", "follow")
        )
    )
    val notifications: StateFlow<List<NotificationItem>> = _notifications.asStateFlow()

    private val _activeRoom = MutableStateFlow<VoiceRoom?>(null)
    val activeRoom: StateFlow<VoiceRoom?> = _activeRoom.asStateFlow()

    private val _isMuted = MutableStateFlow(true)
    val isMuted: StateFlow<Boolean> = _isMuted.asStateFlow()

    private val _roomMessages = MutableStateFlow<List<RoomMessage>>(emptyList())
    val roomMessages: StateFlow<List<RoomMessage>> = _roomMessages.asStateFlow()

    fun toggleLikePost(postId: String) {
        val myUid = _currentUser.value.uid
        _posts.update { list ->
            list.map { post ->
                if (post.id == postId) {
                    val alreadyLiked = post.likedBy.contains(myUid)
                    val newLikedBy = if (alreadyLiked) post.likedBy - myUid else post.likedBy + myUid
                    val newCount = if (alreadyLiked) post.likes - 1 else post.likes + 1
                    post.copy(likes = newCount.coerceAtLeast(0), likedBy = newLikedBy)
                } else post
            }
        }
    }

    fun addComment(postId: String, text: String) {
        if (text.isBlank()) return
        val user = _currentUser.value
        val comment = CommentItem(
            id = "c-${System.currentTimeMillis()}",
            uid = user.uid,
            username = user.username,
            avatar = user.photoURL,
            text = text.trim(),
            createdAt = "Just now",
            isVerified = user.isVerified
        )
        _posts.update { list ->
            list.map { post ->
                if (post.id == postId) {
                    post.copy(comments = post.comments + comment)
                } else post
            }
        }
    }

    fun toggleFollowUser(username: String) {
        _currentUser.update { user ->
            val isFollowing = user.following.contains(username)
            val newFollowing = if (isFollowing) user.following - username else user.following + username
            user.copy(
                following = newFollowing,
                followingCount = newFollowing.size
            )
        }
    }

    fun createPost(imageUrl: String, caption: String, filter: String) {
        val user = _currentUser.value
        val newPost = Post(
            id = "post-${System.currentTimeMillis()}",
            uid = user.uid,
            username = user.username,
            avatar = user.photoURL,
            image = imageUrl.ifBlank { "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80" },
            caption = caption,
            filter = filter,
            likes = 0,
            likedBy = emptyList(),
            comments = emptyList(),
            createdAt = System.currentTimeMillis(),
            isVerified = user.isVerified
        )
        _posts.update { listOf(newPost) + it }
    }

    fun joinVoiceRoom(room: VoiceRoom) {
        _activeRoom.value = room
        _roomMessages.value = listOf(
            RoomMessage("m1", "host-maya", "maya_beats", "Maya Beats", "", "Welcome to the lounge everyone! ☕️ Feel free to request mic.", System.currentTimeMillis() - 600000)
        )
    }

    fun leaveVoiceRoom() {
        _activeRoom.value = null
        _roomMessages.value = emptyList()
    }

    fun toggleMute() {
        _isMuted.update { !it }
    }

    fun sendRoomMessage(text: String) {
        if (text.isBlank()) return
        val user = _currentUser.value
        val msg = RoomMessage(
            id = "msg-${System.currentTimeMillis()}",
            uid = user.uid,
            username = user.username,
            displayName = user.displayName,
            avatar = user.photoURL,
            text = text.trim()
        )
        _roomMessages.update { it + msg }
    }

    fun createVoiceRoom(title: String, topic: String, tags: List<String>, vibe: String): VoiceRoom {
        val user = _currentUser.value
        val room = VoiceRoom(
            id = "room-${System.currentTimeMillis()}",
            title = title.ifBlank { "Live Hangout 🎙️" },
            topic = topic.ifBlank { "Open Chat & Music" },
            hostUid = user.uid,
            hostUsername = user.username,
            hostDisplayName = user.displayName,
            hostAvatar = user.photoURL,
            speakers = listOf(
                RoomParticipant(user.uid, user.username, user.displayName, user.photoURL, isHost = true, isSpeaker = true, isMuted = false, seatNumber = 0)
            ),
            listeners = emptyList(),
            tags = tags.ifEmpty { listOf("Live", "Chat") },
            ambientVibe = vibe
        )
        _voiceRooms.update { listOf(room) + it }
        _activeRoom.value = room
        return room
    }

    fun addCoins(amount: Int) {
        _currentUser.update { it.copy(coinsBalance = it.coinsBalance + amount) }
    }

    fun sendTip(amount: Int) {
        if (_currentUser.value.coinsBalance >= amount) {
            _currentUser.update { it.copy(coinsBalance = it.coinsBalance - amount) }
        }
    }
}
