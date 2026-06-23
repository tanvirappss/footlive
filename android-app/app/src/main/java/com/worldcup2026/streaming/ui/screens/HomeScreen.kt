package com.worldcup2026.streaming.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import coil.request.ImageRequest
import com.worldcup2026.streaming.domain.model.Announcement
import com.worldcup2026.streaming.domain.model.Match
import com.worldcup2026.streaming.ui.MainViewModel
import com.worldcup2026.streaming.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun HomeScreen(
    viewModel: MainViewModel,
    onWatchMatch: (matchId: String, matchTitle: String) -> Unit,
    onViewDetails: (matchId: String) -> Unit
) {
    val liveMatches by viewModel.liveMatches.collectAsState()
    val upcomingMatches by viewModel.upcomingMatches.collectAsState()
    val finishedMatches by viewModel.finishedMatches.collectAsState()
    val announcements by viewModel.announcements.collectAsState()

    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Live Now", "Upcoming", "Results")

    val haptic = LocalHapticFeedback.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundColor)
    ) {
        // App header
        HeaderBar()

        // Announcement Center Banner
        if (announcements.isNotEmpty()) {
            AnnouncementBanner(announcement = announcements.first())
        }

        // Custom Navigation Tabs
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color.Transparent,
            contentColor = PrimaryEmerald,
            divider = { HorizontalDivider(color = SlateDark.copy(alpha = 0.5f)) },
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            tabs.forEachIndexed { index, title ->
                val isSelected = selectedTab == index
                Tab(
                    selected = isSelected,
                    onClick = { 
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        selectedTab = index 
                    },
                    text = {
                        Text(
                            text = title,
                            fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                            fontSize = 13.sp,
                            letterSpacing = 1.sp
                        )
                    }
                )
            }
        }

        // LazyLists of Matches
        val currentList = when (selectedTab) {
            0 -> liveMatches
            1 -> upcomingMatches
            else -> finishedMatches
        }

        if (currentList.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No matches available in this category.",
                    color = SlateMedium,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(currentList, key = { it.id }) { match ->
                    MatchCard(
                        match = match,
                        onWatch = { 
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onWatchMatch(match.id, "${match.homeTeam?.name ?: match.homeTeamCustomName} vs ${match.awayTeam?.name ?: match.awayTeamCustomName}") 
                        },
                        onDetails = { 
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onViewDetails(match.id) 
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun HeaderBar() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        Column {
            Text(
                text = "WORLD CUP 2026",
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 1.5.sp
            )
            Text(
                text = "Premium Streaming Center",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = PrimaryEmerald,
                letterSpacing = 2.sp
            )
        }

        // Visual header indicator
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(SurfaceColor, shape = RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(text = "⚽", fontSize = 18.sp)
        }
    }
}

@Composable
fun AnnouncementBanner(announcement: Announcement) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.horizontalGradient(
                    colors = listOf(
                        PrimaryEmerald.copy(alpha = 0.15f),
                        SecondaryGold.copy(alpha = 0.05f)
                    )
                )
            )
            .clickable { /* Tap to view details */ }
            .padding(16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(Color.White.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = "Notification",
                    tint = SecondaryGold,
                    modifier = Modifier.size(16.dp)
                )
            }
            Column {
                Text(
                    text = announcement.title,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                Text(
                    text = announcement.message,
                    color = SlateLight,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun MatchCard(
    match: Match,
    onWatch: () -> Unit,
    onDetails: () -> Unit
) {
    val isLive = (match.status == "live" || match.status == "half_time" ||
                  (match.status == "upcoming" && System.currentTimeMillis() >= (match.matchTimestamp - 10 * 60 * 1000))) &&
                 System.currentTimeMillis() < (match.matchTimestamp + 105 * 60 * 1000)
    val isUpcoming = match.status == "upcoming" && System.currentTimeMillis() < (match.matchTimestamp - 10 * 60 * 1000)
    val isFinished = match.status == "finished" ||
                     ((match.status == "live" || match.status == "half_time" || match.status == "upcoming") &&
                      System.currentTimeMillis() >= (match.matchTimestamp + 105 * 60 * 1000))

    Card(
        colors = CardDefaults.cardColors(containerColor = CardColor),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // League Header info
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = match.tournamentName.uppercase(),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    color = SecondaryGold,
                    letterSpacing = 1.sp
                )
                
                if (isLive) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(AccentRed, shape = androidx.compose.foundation.shape.CircleShape)
                        )
                        Text(
                            text = "LIVE",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = AccentRed
                        )
                    }
                } else if (isUpcoming) {
                    Text(
                        text = "UPCOMING",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryEmerald
                    )
                } else {
                    Text(
                        text = match.status.uppercase(),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = SlateMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Versus Section
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Home Team
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.weight(1f)
                ) {
                    FlagView(
                        url = match.homeTeam?.flagUrl ?: match.homeTeamCustomFlag,
                        shortName = match.homeTeam?.shortName ?: "HOM"
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = match.homeTeam?.name ?: match.homeTeamCustomName ?: "Home Team",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Score or VS details
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.width(80.dp)
                ) {
                    if (isLive || isFinished) {
                        Text(
                            text = "${match.homeScore} - ${match.awayScore}",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .background(BackgroundColor, shape = RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "VS",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = SlateMedium
                            )
                        }
                    }
                }

                // Away Team
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.weight(1f)
                ) {
                    FlagView(
                        url = match.awayTeam?.flagUrl ?: match.awayTeamCustomFlag,
                        shortName = match.awayTeam?.shortName ?: "AWA"
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = match.awayTeam?.name ?: match.awayTeamCustomName ?: "Away Team",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (!match.homeScorers.isNullOrBlank() || !match.awayScorers.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceColor.copy(alpha = 0.4f), shape = RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = match.homeScorers ?: "",
                        color = SlateLight,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Start,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "⚽",
                        color = SlateMedium,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = match.awayScorers ?: "",
                        color = SlateLight,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.End,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Stadium Info
            Text(
                text = "🏟️ ${match.stadiumName}",
                color = SlateMedium,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            // Dynamic Countdown display if upcoming
            if (isUpcoming) {
                Spacer(modifier = Modifier.height(16.dp))
                CountdownTimer(targetTimestamp = match.matchTimestamp)
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Control Buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = onDetails,
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceColor),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(vertical = 12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Details",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = "Details", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                if (isLive || isUpcoming) {
                    Button(
                        onClick = onWatch,
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryEmerald),
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(vertical = 12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Watch",
                            tint = Color.Black,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isLive) "Watch Live" else "Watch Stream", 
                            color = Color.Black, 
                            fontWeight = FontWeight.Black, 
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FlagView(url: String?, shortName: String) {
    val context = LocalContext.current
    
    Box(
        modifier = Modifier
            .size(width = 68.dp, height = 46.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(BackgroundColor)
            .padding(1.dp)
    ) {
        if (!url.isNullOrEmpty()) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(url)
                    .decoderFactory(SvgDecoder.Factory()) // Decodes SVGs smoothly
                    .crossfade(true)
                    .build(),
                contentDescription = "$shortName Flag",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                Text(
                    text = shortName,
                    color = SlateMedium,
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@Composable
fun CountdownTimer(targetTimestamp: Long) {
    var timeRemaining by remember(targetTimestamp) {
        mutableStateOf(targetTimestamp - System.currentTimeMillis())
    }

    LaunchedEffect(key1 = targetTimestamp) {
        while (timeRemaining > 0) {
            delay(1000)
            timeRemaining = targetTimestamp - System.currentTimeMillis()
        }
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = "STARTS IN",
            fontSize = 9.sp,
            fontWeight = FontWeight.Black,
            color = SlateMedium,
            letterSpacing = 1.sp
        )
        
        Spacer(modifier = Modifier.height(8.dp))

        if (timeRemaining <= 0) {
            Text(
                text = "MATCH STARTED!", 
                color = PrimaryEmerald, 
                fontWeight = FontWeight.Black,
                fontSize = 14.sp
            )
        } else {
            val seconds = (timeRemaining / 1000) % 60
            val minutes = (timeRemaining / (1000 * 60)) % 60
            val hours = (timeRemaining / (1000 * 60 * 60)) % 24
            val days = (timeRemaining / (1000 * 60 * 60 * 24))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TimeBox(value = days, label = "Days")
                Text(text = ":", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                TimeBox(value = hours, label = "Hours")
                Text(text = ":", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                TimeBox(value = minutes, label = "Mins")
                Text(text = ":", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                TimeBox(value = seconds, label = "Secs")
            }
        }
    }
}

@Composable
fun TimeBox(value: Long, label: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .background(BackgroundColor, shape = RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp)
            .width(36.dp)
    ) {
        Text(
            text = String.format("%02d", value),
            color = Color.White,
            fontWeight = FontWeight.Black,
            fontSize = 15.sp
        )
        Text(
            text = label.uppercase(),
            color = SlateMedium,
            fontWeight = FontWeight.Bold,
            fontSize = 7.sp,
            letterSpacing = 0.5.sp
        )
    }
}
