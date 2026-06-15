package com.worldcup2026.streaming.ui.screens

import android.os.Build
import android.text.Html
import android.widget.TextView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import coil.compose.AsyncImage
import com.worldcup2026.streaming.domain.model.Match
import com.worldcup2026.streaming.ui.MainViewModel
import com.worldcup2026.streaming.ui.theme.*
import kotlinx.coroutines.flow.map

@Composable
fun MatchDetailsScreen(
    matchId: String,
    viewModel: MainViewModel,
    onBack: () -> Unit
) {
    // Find matching match from lists
    val matchesFlow = remember(matchId) { 
        viewModel.liveMatches.map { list -> list.find { it.id == matchId } }
            .combine(viewModel.upcomingMatches.map { list -> list.find { it.id == matchId } }) { l, u -> l ?: u }
            .combine(viewModel.finishedMatches.map { list -> list.find { it.id == matchId } }) { prev, f -> prev ?: f }
    }
    
    val match by matchesFlow.collectAsState(initial = null)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundColor)
    ) {
        // App bar
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Match Event Preview",
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
        }

        if (match == null) {
            Box(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = PrimaryEmerald)
            }
        } else {
            val activeMatch = match!!
            val homeName = activeMatch.homeTeam?.name ?: activeMatch.homeTeamCustomName ?: "Home Team"
            val awayName = activeMatch.awayTeam?.name ?: activeMatch.awayTeamCustomName ?: "Away Team"

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Match Poster / Banner
                if (!activeMatch.bannerUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = activeMatch.bannerUrl,
                        contentDescription = "Match Banner",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(20.dp))
                    )
                }

                // Versus display card
                Card(
                    colors = CardDefaults.cardColors(containerColor = CardColor),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Text(
                            text = activeMatch.tournamentName.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = SecondaryGold,
                            letterSpacing = 1.sp
                        )

                        Spacer(modifier = Modifier.height(20.dp))

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
                                    url = activeMatch.homeTeam?.flagUrl ?: activeMatch.homeTeamCustomFlag,
                                    shortName = activeMatch.homeTeam?.shortName ?: "HOM"
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = homeName,
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 14.sp,
                                    textAlign = TextAlign.Center,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            // VS / Score
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.width(60.dp)
                            ) {
                                val isMatchLive = (activeMatch.status == "live" || activeMatch.status == "half_time" ||
                                                   (activeMatch.status == "upcoming" && System.currentTimeMillis() >= (activeMatch.matchTimestamp - 10 * 60 * 1000))) &&
                                                  System.currentTimeMillis() < (activeMatch.matchTimestamp + 105 * 60 * 1000)
                                val isMatchFinished = activeMatch.status == "finished" ||
                                                      ((activeMatch.status == "live" || activeMatch.status == "half_time" || activeMatch.status == "upcoming") &&
                                                       System.currentTimeMillis() >= (activeMatch.matchTimestamp + 105 * 60 * 1000))
                                val isMatchFinishedWithScore = isMatchFinished && (activeMatch.homeScore > 0 || activeMatch.awayScore > 0)

                                if (isMatchLive || isMatchFinishedWithScore) {
                                    Text(
                                        text = "${activeMatch.homeScore} - ${activeMatch.awayScore}",
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                    Text(
                                        text = if (isMatchLive && activeMatch.status == "upcoming") "LIVE" else activeMatch.status.uppercase(),
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = PrimaryEmerald
                                    )
                                } else {
                                    Text(
                                        text = "VS",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black,
                                        color = SlateMedium
                                    )
                                }
                            }

                            // Away Team
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.weight(1f)
                            ) {
                                FlagView(
                                    url = activeMatch.awayTeam?.flagUrl ?: activeMatch.awayTeamCustomFlag,
                                    shortName = activeMatch.awayTeam?.shortName ?: "AWA"
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = awayName,
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 14.sp,
                                    textAlign = TextAlign.Center,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                        HorizontalDivider(color = SlateDark.copy(alpha = 0.5f))
                        Spacer(modifier = Modifier.height(16.dp))

                        // Match Time info
                        Text(
                            text = "🏟️ Stadium: ${activeMatch.stadiumName}",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "📅 Date: ${activeMatch.matchDate} | ⏰ Kickoff: ${activeMatch.matchTime.substring(0, 5)}",
                            color = SlateMedium,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }

                // Match details description card (Render rich text preview safely)
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceColor, shape = RoundedCornerShape(20.dp))
                        .padding(20.dp)
                ) {
                    Text(
                        text = "MATCH ANALYSIS & PREVIEW",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = SlateMedium,
                        letterSpacing = 1.sp
                    )
                    
                    HorizontalDivider(color = SlateDark.copy(alpha = 0.5f))

                    if (!activeMatch.description.isNullOrEmpty()) {
                        HtmlText(html = activeMatch.description!!)
                    } else {
                        Text(
                            text = "No preview description is currently registered for this match. Tune back closer to kickoff for live analyst reviews.",
                            color = SlateMedium,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            lineHeight = 18.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun HtmlText(html: String, modifier: Modifier = Modifier) {
    AndroidView(
        modifier = modifier.fillMaxWidth(),
        factory = { context ->
            TextView(context).apply {
                setTextColor(android.graphics.Color.parseColor("#E2E8F0")) // SlateLight hex
                textSize = 13f
                lineSpacingMultiplier = 1.25f
            }
        },
        update = { textView ->
            textView.text = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                Html.fromHtml(html, Html.FROM_HTML_MODE_COMPACT)
            } else {
                Html.fromHtml(html)
            }
        }
    )
}
