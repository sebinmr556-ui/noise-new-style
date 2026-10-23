package com.example.noise.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.noise.ui.theme.*

@Composable
fun CoinsDialog(
    balance: Int,
    onBuyCoins: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    val coinPacks = listOf(
        100 to "$0.99",
        500 to "$4.99",
        1200 to "$9.99",
        2500 to "$19.99"
    )

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = SurfaceDark,
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Noise Coins Store",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.testTag("close_coins_store")) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary)
                    }
                }

                // Balance Card
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = CardDark,
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandIndigo.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Current Balance",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary
                            )
                            Text(
                                text = "$balance Coins",
                                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                                color = AccentAmber
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.MonetizationOn,
                            contentDescription = null,
                            tint = AccentAmber,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                Text(
                    text = "Use coins to tip stage speakers, trigger animated emoji bursts, and support creators.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )

                // Coin Bundles
                coinPacks.forEach { (amount, price) ->
                    Surface(
                        onClick = { onBuyCoins(amount) },
                        shape = RoundedCornerShape(14.dp),
                        color = CardDark,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("buy_coins_$amount")
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.MonetizationOn, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(20.dp))
                                Text(
                                    text = "$amount Coins",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = TextPrimary
                                )
                            }
                            Text(
                                text = price,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = BrandCyan
                            )
                        }
                    }
                }
            }
        }
    }
}
