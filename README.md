# Noise • Social & Live Voice Rooms (Android)

Noise is a modern social platform and live voice audio community built natively for Android using **Kotlin** and **Jetpack Compose** (Material 3).

## Features

- **Live Voice Chatrooms**:
  - Real-time 8-slot audio stage with animated speaker soundwave pulses.
  - Interactive PK Battle mode with real-time score tracking and countdown timer.
  - Host voice rooms with customizable ambient background vibes (Lofi, Synth, Rain, Cafe).
  - Floating emoji reaction bursts and live in-room text chat.
  - Persistent Floating Mini-Player allowing background listening while navigating through feeds.
  - Virtual Noise Coins tipping and gifting for stage speakers.
- **Social Feed & Media**:
  - Interactive photo feed with double-tap heart animations, bookmarks, and detailed comments.
  - Photo filter styling (Normal, Clarendon, Juno, Vintage, B&W, Warm, Cyber).
  - Stories with segmented progress auto-advance, tap navigation, and quick reply.
  - Full-bleed vertical Reels video clips with audio tracks and spinning vinyl record indicators.
- **Explore & Community**:
  - Real-time creator search and topic filtering.
  - Visual exploration grid with trending tags.
  - Creator profiles with follow/unfollow and metrics.
- **Direct Messaging**:
  - Peer-to-peer conversations with online presence indicators, read receipts, and instant text delivery.

## Architecture

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose (Material Design 3)
- **Architecture Pattern**: MVVM (Model-View-ViewModel) + Clean Architecture
- **State Management**: Kotlin Coroutines & `MutableStateFlow` / `StateFlow`
- **Image Loading**: Coil Compose (`AsyncImage`)
- **System Design**: Full Edge-to-Edge (`enableEdgeToEdge`) with `WindowInsets` safe drawing and navigation bar padding.

## Project Structure

```
app/
 └── src/main/
      ├── AndroidManifest.xml
      ├── java/com/example/noise/
      │    ├── NoiseApplication.kt
      │    ├── MainActivity.kt
      │    ├── model/Models.kt
      │    ├── data/NoiseRepository.kt
      │    ├── viewmodel/NoiseViewModel.kt
      │    ├── ui/
      │    │    ├── NoiseApp.kt
      │    │    ├── theme/ (Color.kt, Theme.kt, Type.kt)
      │    │    ├── components/ (NoiseTopBar, NoiseBottomBar, StoriesRow, LiveVoiceRoomsBar, PostCard, VoiceRoomMiniPlayer)
      │    │    ├── screens/ (HomeScreen, ExploreScreen, UploadScreen, ReelsScreen, ProfileScreen)
      │    │    └── dialogs/ (VoiceRoomDialog, CreateVoiceRoomDialog, DirectMessagesDialog, CommentsSheet, StoryViewerDialog, NotificationsDialog, CoinsDialog)
      └── res/
           ├── values/ (strings.xml, colors.xml, themes.xml)
           ├── drawable/ (adaptive launcher assets)
           └── mipmap-*/ (density launcher icons)
```

## Running the Android Application

1. Open the project in **Android Studio** (Ladybug or newer recommended).
2. Sync the project with Gradle files (`libs.versions.toml`).
3. Run on an Android emulator or connected device running Android 8.0 (API level 26) or higher.
4. Build APK:
   ```bash
   ./gradlew assembleDebug
   ```
