package com.example.noise.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.noise.model.AppUser
import com.example.noise.model.Post
import com.example.noise.ui.theme.*

@Composable
fun ProfileScreen(
    currentUser: AppUser,
    userPosts: List<Post>,
    onOpenCoins: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BackgroundBlack)
            .statusBarsPadding()
    ) {
        // Top App Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = currentUser.username,
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = TextPrimary
                )
                if (currentUser.isVerified) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Verified",
                        tint = BrandCyan,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            IconButton(onClick = onOpenCoins) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Settings",
                    tint = TextPrimary
                )
            }
        }

        // Profile Details
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(BrandGradient),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = currentUser.photoURL,
                    contentDescription = currentUser.displayName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(76.dp)
                        .clip(CircleShape)
                        .border(2.dp, BackgroundBlack, CircleShape)
                )
            }

            // Stats Row
            Row(
                horizontalArrangement = Arrangement.spacedBy(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ProfileStat(count = "${userPosts.size}", label = "Posts")
                ProfileStat(count = "${currentUser.followersCount}", label = "Followers")
                ProfileStat(count = "${currentUser.followingCount}", label = "Following")
            }
        }

        // Bio & Website
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp)
        ) {
            Text(
                text = currentUser.displayName,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary
            )
            if (currentUser.bio.isNotBlank()) {
                Text(
                    text = currentUser.bio,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
            if (currentUser.website.isNotBlank()) {
                Text(
                    text = currentUser.website,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
                    color = BrandCyan,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }

        // Actions: Edit Profile, Share, Coins balance pill
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = {},
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = ElevatedDark,
                    contentColor = TextPrimary
                ),
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .testTag("edit_profile_button")
            ) {
                Text("Edit Profile", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold))
            }

            Button(
                onClick = onOpenCoins,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = CardDark,
                    contentColor = AccentAmber
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
                modifier = Modifier
                    .height(38.dp)
                    .testTag("profile_coins_button")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.MonetizationOn,
                        contentDescription = "Coins",
                        tint = AccentAmber,
                        modifier = Modifier.size(16.dp)
                    )
                    Text("${currentUser.coinsBalance} Coins", fontWeight = FontWeight.Bold)
                }
            }
        }

        // Tabs: Grid, Saved, Liked
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = BackgroundBlack,
            contentColor = BrandCyan,
            divider = { HorizontalDivider(color = BorderDark, thickness = 0.5.dp) }
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                icon = { Icon(Icons.Default.GridOn, contentDescription = "Posts") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                icon = { Icon(Icons.Default.BookmarkBorder, contentDescription = "Saved") }
            )
            Tab(
                selected = selectedTab == 2,
                onClick = { selectedTab = 2 },
                icon = { Icon(Icons.Default.FavoriteBorder, contentDescription = "Liked") }
            )
        }

        // Posts Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            contentPadding = PaddingValues(1.dp),
            horizontalArrangement = Arrangement.spacedBy(1.dp),
            verticalArrangement = Arrangement.spacedBy(1.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 90.dp)
        ) {
            items(userPosts) { post ->
                Box(
                    modifier = Modifier
                        .aspectRatio(1f)
                        .background(CardDark)
                ) {
                    AsyncImage(
                        model = post.image,
                        contentDescription = post.caption,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileStat(count: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = count,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 16.sp),
            color = TextPrimary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary
        )
    }
}
