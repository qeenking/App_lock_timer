package com.applocktimer

import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.*

class LockActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        val isRestTime = intent.getBooleanExtra("isRestTime", false)

        val root = FrameLayout(this)

        // 배경 이미지 (전체화면) — 휴식 시간이면 별도 배경 사용
        val bgImage = ImageView(this).apply {
            val bgName = if (isRestTime) "lock_background_rest" else "lock_background"
            setImageResource(resources.getIdentifier(bgName, "drawable", packageName))
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        root.addView(bgImage, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        if (isRestTime) {
            buildRestTimeContent(root)
        } else {
            buildDailyLimitContent(root)
        }

        setContentView(root)
    }

    // ── 하루 사용시간 초과로 잠긴 경우 (기존 화면, 변경 없음) ──
    private fun buildDailyLimitContent(root: FrameLayout) {
        val usedMinutes = intent.getIntExtra("usedMinutes", 0)
        val limitMinutes = intent.getIntExtra("limitMinutes", 0)

        val cardBg = GradientDrawable().apply {
            setColor(Color.WHITE)
            cornerRadii = floatArrayOf(48f, 48f, 48f, 48f, 0f, 0f, 0f, 0f)
        }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = cardBg
            setPadding(56, 56, 56, 64)
        }

        val cardTitle = TextView(this).apply {
            text = "오늘 사용 요약"
            setTextColor(Color.parseColor("#7C6FEF"))
            textSize = 15f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, 0, 0, 20)
        }

        fun summaryRow(label: String, value: String): LinearLayout {
            return LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, 20, 0, 20)
                val labelView = TextView(this@LockActivity).apply {
                    text = label
                    setTextColor(Color.parseColor("#6B6885"))
                    textSize = 15f
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }
                val valueView = TextView(this@LockActivity).apply {
                    text = value
                    setTextColor(Color.parseColor("#2C2A3D"))
                    textSize = 16f
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                }
                addView(labelView)
                addView(valueView)
            }
        }

        val divider = android.view.View(this).apply {
            setBackgroundColor(Color.parseColor("#EEEBFB"))
        }
        val dividerParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 2
        )

        val confirmBtn = Button(this).apply {
            text = "확인"
            setTextColor(Color.WHITE)
            textSize = 16f
            isAllCaps = false
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#5B4FCF"))
                cornerRadius = 28f
            }
            setOnClickListener { finish() }
        }
        val btnParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            160
        ).apply { topMargin = 32 }

        card.addView(cardTitle)
        card.addView(summaryRow("총 사용 시간", "${usedMinutes}분"))
        card.addView(divider, dividerParams)
        card.addView(summaryRow("설정 제한 시간", "${limitMinutes}분"))
        card.addView(confirmBtn, btnParams)

        val cardParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.BOTTOM }

        root.addView(card, cardParams)
    }

    // ── 휴식 시간대라서 잠긴 경우 (새 화면) ──
    private fun buildRestTimeContent(root: FrameLayout) {
        val restStartMinute = intent.getIntExtra("restStartMinute", 0)
        val restEndMinute = intent.getIntExtra("restEndMinute", 0)

        fun minuteToHHMM(m: Int): String {
            val h = (m / 60) % 24
            val mm = m % 60
            return String.format("%02d:%02d", h, mm)
        }

        val bottomContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(64, 0, 64, 96)
        }

        val titleText = TextView(this).apply {
            text = "지금은 휴식 시간이에요"
            setTextColor(Color.parseColor("#2C2A3D"))
            textSize = 22f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val subtitleText = TextView(this).apply {
            text = "더 건강한 사용을 위해\n앱 사용이 제한되었습니다."
            setTextColor(Color.parseColor("#8B87A6"))
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 40)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 휴식 시간 안내 카드
        val cardBg = GradientDrawable().apply {
            setColor(Color.parseColor("#F8F7FD"))
            cornerRadius = 40f
        }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = cardBg
            setPadding(48, 48, 48, 48)
        }

        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 32)

            val icon = ImageView(this@LockActivity).apply {
                setImageResource(resources.getIdentifier("icon_clock_small", "drawable", packageName))
            }
            addView(icon, LinearLayout.LayoutParams(64, 64).apply { rightMargin = 24 })

            val textCol = LinearLayout(this@LockActivity).apply {
                orientation = LinearLayout.VERTICAL
            }
            val label = TextView(this@LockActivity).apply {
                text = "휴식 시간"
                setTextColor(Color.parseColor("#5B4FCF"))
                textSize = 13f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            }
            val value = TextView(this@LockActivity).apply {
                text = "${minuteToHHMM(restStartMinute)} ~ ${minuteToHHMM(restEndMinute)}"
                setTextColor(Color.parseColor("#2C2A3D"))
                textSize = 19f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                setPadding(0, 4, 0, 0)
            }
            textCol.addView(label)
            textCol.addView(value)
            addView(textCol)
        }

        val divider = android.view.View(this).apply {
            setBackgroundColor(Color.parseColor("#E7E4F5"))
        }
        val dividerParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 2
        ).apply { bottomMargin = 32 }

        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL

            val infoIcon = TextView(this@LockActivity).apply {
                text = "ⓘ"
                setTextColor(Color.parseColor("#9C99B4"))
                textSize = 18f
                setPadding(0, 0, 20, 0)
            }
            val infoText = TextView(this@LockActivity).apply {
                text = "설정된 휴식 시간에는\n앱 사용이 불가능합니다."
                setTextColor(Color.parseColor("#8B87A6"))
                textSize = 13f
            }
            addView(infoIcon)
            addView(infoText)
        }

        card.addView(row1)
        card.addView(divider, dividerParams)
        card.addView(row2)

        bottomContainer.addView(titleText)
        bottomContainer.addView(subtitleText)
        bottomContainer.addView(card)

        val containerParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.BOTTOM }

        root.addView(bottomContainer, containerParams)
    }

    override fun onBackPressed() {
        // 뒤로가기로 벗어나지 못하게 막음
    }
}
