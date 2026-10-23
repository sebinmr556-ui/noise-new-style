package com.example.noise.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.noise.model.NavTab
import com.example.noise.ui.theme.*

@Composable
fun NoiseBottomBar(
    currentTab: NavTab,
    onTabSelected: (NavTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = BackgroundBlack,
        border = androidx.compose.foundation.BorderStroke(0.5.dp, BorderDark)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(vertical = 6.dp, horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            NavItem(
                icon = if (currentTab == NavTab.HOME) Icons.Filled.Home else Icons.Outlined.Home,
                label = "Home",
                isSelected = currentTab == NavTab.HOME,
                testTag = "nav_home",
                onClick = { onTabSelected(NavTab.HOME) }
            )

            NavItem(
                icon = if (currentTab == NavTab.EXPLORE) Icons.Filled.Explore else Icons.Outlined.Explore,
                label = "Explore",
                isSelected = currentTab == NavTab.EXPLORE,
                testTag = "nav_explore",
                onClick = { onTabSelected(NavTab.EXPLORE) }
            )

            // Center Create Action (+)
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(BrandGradient)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = ripple()
                    ) { onTabSelected(NavTab.UPLOAD) }
                    .testTag("nav_upload"),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Create Post or Room",
                    tint = Color.Black,
                    modifier = Modifier.size(28.dp)
                )
            }

            NavItem(
                icon = if (currentTab == NavTab.REELS) Icons.Filled.PlayArrow else Icons.Outlined.PlayCircle,
                label = "Reels",
                isSelected = currentTab == NavTab.REELS,
                testTag = "nav_reels",
                onClick = { onTabSelected(NavTab.REELS) }
            )

            NavItem(
                icon = if (currentTab == NavTab.PROFILE) Icons.Filled.Person else Icons.Outlined.Person,
                label = "Profile",
                isSelected = currentTab == NavTab.PROFILE,
                testTag = "nav_profile",
                onClick = { onTabSelected(NavTab.PROFILE) }
            )
        }
    }
}

@Composable
private fun NavItem(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    testTag: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple()
            ) { onClick() }
            .testTag(testTag),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isSelected) BrandCyan else TextSecondary,
                modifier = Modifier.size(26.dp)
            )
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .padding(top = 2.dp)
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(BrandCyan)
                )
            }
        }
    }
}
