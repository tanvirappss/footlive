package com.worldcup2026.streaming.ui.screens

import android.view.animation.OvershootInterpolator
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.worldcup2026.streaming.ui.theme.BackgroundColor
import com.worldcup2026.streaming.ui.theme.PrimaryEmerald
import com.worldcup2026.streaming.ui.theme.SecondaryGold
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onNavigateToHome: () -> Unit) {
    val scale = remember { Animatable(0f) }

    // Overshoot scale animation for logo
    LaunchedEffect(key1 = true) {
        scale.animateTo(
            targetValue = 1.1f,
            animationSpec = tween(
                durationMillis = 1000,
                easing = { OvershootInterpolator(2.5f).getInterpolation(it) }
            )
        )
        delay(1000) // Delay to showcase logo
        onNavigateToHome()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        BackgroundColor,
                        Color(0xFF070F1A)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.scale(scale.value)
        ) {
            // Premium Logo Glyph
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(120.dp)
                    .background(PrimaryEmerald.copy(alpha = 0.15f), shape = androidx.compose.foundation.shape.CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                PrimaryEmerald.copy(alpha = 0.1f),
                                Color.Transparent
                            )
                        )
                    )
                    .padding(16.dp)
            ) {
                Text(
                    text = "🏆",
                    fontSize = 52.sp,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "WORLD CUP 2026",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 2.sp
            )

            Text(
                text = "PREMIUM LIVE BROADCAST",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = SecondaryGold,
                letterSpacing = 4.sp,
                modifier = Modifier.padding(top = 4.dp)
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            CircularProgressIndicator(
                color = PrimaryEmerald,
                strokeWidth = 3.dp,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}
