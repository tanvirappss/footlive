package com.worldcup2026.streaming

import org.junit.Assert.assertEquals
import org.junit.Test

class CountdownTest {

    @Test
    fun testCountdownCalculation() {
        // Mock a target timestamp precisely 5 days, 8 hours, 12 minutes, and 30 seconds in the future
        val currentMillis = System.currentTimeMillis()
        val targetMillis = currentMillis + 
                (5 * 24 * 60 * 60 * 1000L) + 
                (8 * 60 * 60 * 1000L) + 
                (12 * 60 * 1000L) + 
                (30 * 1000L)

        val difference = targetMillis - currentMillis

        val seconds = (difference / 1000) % 60
        val minutes = (difference / (1000 * 60)) % 60
        val hours = (difference / (1000 * 60 * 60)) % 24
        val days = (difference / (1000 * 60 * 60 * 24))

        // Assert our arithmetic operations match expectations
        assertEquals(5L, days)
        assertEquals(8L, hours)
        assertEquals(12L, minutes)
        assertEquals(30L, seconds)
    }

    @Test
    fun testEndedCountdown() {
        val currentMillis = System.currentTimeMillis()
        val targetMillis = currentMillis - 10000L // 10 seconds ago

        val difference = targetMillis - currentMillis
        val isEnded = difference <= 0

        assertEquals(true, isEnded)
    }
}
