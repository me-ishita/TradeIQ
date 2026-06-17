import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ScrollView,
  Animated,
  ImageStyle,
} from "react-native";
import {
  Play,
  BookOpen,
  Clock,
  Award,
  RotateCcw,
  ExternalLink,
  Shield,
  TrendingUp,
  Brain,
  Landmark,
  ArrowRight,
  CheckCircle2,
  Users,
} from "lucide-react-native";
import { Course, CourseProgress } from "../types";
import { C, font } from "../constants";

interface CoursesProps {
  user: any;
  courses: Course[];
  progress: CourseProgress[];
  onProgressUpdated: (courseId: number, watchedPercent: number) => void;
}

const DRA_COURSES = [
  {
    id: "ib",
    title: "Investment Banking Programme",
    subtitle: "New Launch • August Cohort",
    description:
      "A 4-week live, high-intensity programme led by professionals working in top UK investment banks across digital risk, cyber risk, and financial services.",
    highlights: [
      "For students & early-career professionals",
      "Real-world banking scenarios",
      "Career guidance & mentorship",
    ],
    audience: "Students & Early-Career Professionals",
    category: "Investment Banking",
    duration: "4 Weeks Live",
    icon: Landmark,
    color: "#22d3ee",
    borderColor: "rgba(34, 211, 238, 0.3)",
    accentBg: "rgba(8, 47, 73, 0.3)",
    accentText: "#22d3ee",
    accentBorder: "rgba(34, 211, 238, 0.2)",
    badgeBg: "rgba(34, 211, 238, 0.1)",
    url: "https://digitalriskacademy.com/programs/investment-banking",
    thumbnail: "https://images.unsplash.com/photo-1620266757065-5814239881fd?w=600&auto=format&fit=crop&q=60",
  },
  {
    id: "drf",
    title: "Digital Risk Fundamentals",
    subtitle: "Foundation Programme",
    description:
      "Essential foundation for understanding the digital risk landscape. Covers threat identification, risk assessment methodologies, and compliance frameworks for modern enterprises.",
    highlights: [
      "Threat identification & assessment",
      "Compliance frameworks",
      "Risk management methodologies",
    ],
    audience: "New Professionals, Risk Managers, Board Members",
    category: "Risk Management",
    duration: "Self-Paced",
    icon: Shield,
    color: "#6366f1",
    borderColor: "rgba(99, 102, 241, 0.3)",
    accentBg: "rgba(49, 46, 129, 0.3)",
    accentText: "#6366f1",
    accentBorder: "rgba(99, 102, 241, 0.2)",
    badgeBg: "rgba(99, 102, 241, 0.1)",
    url: "https://digitalriskacademy.com/programs/digital-risk-fundamentals",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200",
  },
  {
    id: "crp",
    title: "Cyber Resilience Practitioner",
    subtitle: "Advanced Programme",
    description:
      "Master operational cybersecurity through live-fire training with enterprise-grade toolsets. Graduate Day 1 ready for Security Analyst and SOC leadership roles.",
    highlights: [
      "Live-fire enterprise training",
      "SOC leadership readiness",
      "Enterprise-grade toolsets",
    ],
    audience: "High-potential Graduates, Career Switchers",
    category: "Cybersecurity",
    duration: "8 Weeks",
    icon: TrendingUp,
    color: "#10b981",
    borderColor: "rgba(16, 185, 129, 0.3)",
    accentBg: "rgba(6, 78, 59, 0.3)",
    accentText: "#10b981",
    accentBorder: "rgba(16, 185, 129, 0.2)",
    badgeBg: "rgba(16, 185, 129, 0.1)",
    url: "https://digitalriskacademy.com/programs/cyber-resilience-practitioner",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200",
  },
  {
    id: "airg",
    title: "AI Risk Governance",
    subtitle: "Executive Programme",
    description:
      "Strategic AI deployment and governance frameworks for executive decision-makers navigating regulatory compliance and risk management in the age of artificial intelligence.",
    highlights: [
      "AI regulatory compliance",
      "Strategic governance frameworks",
      "Executive decision-making",
    ],
    audience: "C-Suite, Board Members, Risk Leaders",
    category: "AI Governance",
    duration: "6 Weeks",
    icon: Brain,
    color: "#a855f7",
    borderColor: "rgba(168, 85, 247, 0.3)",
    accentBg: "rgba(88, 28, 135, 0.3)",
    accentText: "#a855f7",
    accentBorder: "rgba(168, 85, 247, 0.2)",
    badgeBg: "rgba(168, 85, 247, 0.1)",
    url: "https://digitalriskacademy.com/programs/ai-risk-governance",
    thumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200",
  },
];

export function Courses({
  user,
  courses,
  progress,
  onProgressUpdated,
}: CoursesProps) {
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);

  const videoPlayerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(DRA_COURSES.map(() => new Animated.Value(0))).current;

  const handleOpenURL = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying && activeCourse) {
      interval = setInterval(() => {
        setVideoProgress((prev) => {
          const next = prev + 5;
          if (next >= 100) {
            setIsPlaying(false);
            onProgressUpdated(activeCourse.course_id, 100);
            setShowCompletionNotification(true);
            return 100;
          }
          if (next % 20 === 0) {
            onProgressUpdated(activeCourse.course_id, next);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeCourse]);

  useEffect(() => {
    Animated.timing(videoPlayerAnim, {
      toValue: activeCourse ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeCourse]);

  useEffect(() => {
    const animations = cardsAnim.map((anim, idx) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: idx * 80,
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, []);

  const getCourseProgress = (courseId: number) => {
    return progress.find((p) => p.course_id === courseId);
  };

  const startCourseVideo = (course: Course) => {
    setActiveCourse(course);
    const existing = getCourseProgress(course.course_id);
    setVideoProgress(existing ? existing.watched_percent : 0);
    setIsPlaying(true);
    setShowCompletionNotification(false);
  };

  // Safe Image style derivation to satisfy absolute fill typing parameters
  const absoluteImageStyle: ImageStyle = {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.pulseDot} />
          <Text style={styles.heroBadgeText}>Digital Risk Academy — Official Programmes</Text>
        </View>
        <Text style={styles.heroTitle}>
          Advance Your Career in{" "}
          <Text style={styles.heroTitleAccent}>Risk & Finance</Text>
        </Text>
        <Text style={styles.heroDescription}>
          Industry-led programmes designed by practitioners at top UK investment banks, cybersecurity firms, and AI governance bodies.
        </Text>
        <TouchableOpacity
          onPress={() => handleOpenURL("https://digitalriskacademy.com/programs")}
          style={styles.heroButton}
        >
          <Text style={styles.heroButtonText}>View All Programmes</Text>
          <ExternalLink size={14} color="#020617" />
        </TouchableOpacity>
      </View>

      {/* Simulated Video Player Container */}
      {activeCourse && (
        <Animated.View
          style={[
            styles.videoPlayerContainer,
            {
              opacity: videoPlayerAnim,
              transform: [
                {
                  scale: videoPlayerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.videoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoMetaText}>
                {(activeCourse.category ?? "GENERAL").toUpperCase()} DESK MASTERCLASS
              </Text>
              <Text style={styles.videoTitle}>{activeCourse.title}</Text>
            </View>
            <TouchableOpacity onPress={() => { setIsPlaying(false); setActiveCourse(null); }}>
              <Text style={styles.exitClassroomText}>EXIT CLASSROOM</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.videoAspectBox}>
            {activeCourse.thumbnail_url && (
              <Image
                source={{ uri: activeCourse.thumbnail_url }}
                style={absoluteImageStyle}
                resizeMode="cover"
              />
            )}

            <View style={styles.videoCenterOverlay}>
              {showCompletionNotification ? (
                <View style={styles.centerNotification}>
                  <View style={styles.awardCircle}>
                    <Award size={24} color="#22d3ee" />
                  </View>
                  <Text style={styles.certifiedText}>Coursework Certified!</Text>
                  <Text style={styles.certifiedSubtext}>You have completed 100% of this lecture.</Text>
                  <TouchableOpacity onPress={() => setVideoProgress(0)} style={styles.rewatchButton}>
                    <RotateCcw size={12} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.rewatchText}>Re-watch</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.centerNotification}>
                  <BookOpen size={48} color="rgba(34, 211, 238, 0.4)" style={{ marginBottom: 12 }} />
                  <Text style={styles.activeLessonText}>Active simulated lesson</Text>
                  <Text style={styles.instructorText}>Instructor: {activeCourse.instructor_name}</Text>
                </View>
              )}
            </View>

            {/* Video Player Controls Bar */}
            <View style={styles.videoControlsRow}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.controlMetaText}>Simulated Course Progress</Text>
                <Text style={styles.controlMetaText}>{videoProgress}% Completed</Text>
              </View>
              <View style={styles.controlActionLine}>
                <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.playPauseBtn}>
                  <Text style={styles.playPauseBtnText}>{isPlaying ? "PAUSE" : "PLAY"}</Text>
                </TouchableOpacity>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${videoProgress}%` }]} />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Section Heading */}
      <View style={styles.sectionHeadingRow}>
        <BookOpen size={16} color="#22d3ee" style={{ marginRight: 12 }} />
        <Text style={styles.sectionTitle}>Official DRA Programmes</Text>
        <View style={styles.sectionLine} />
      </View>

      {/* DRA Course Cards Grid */}
      <View style={styles.cardsGrid}>
        {DRA_COURSES.map((dra, idx) => {
          const IconComponent = dra.icon;
          const simCourse = courses[idx] || courses[0];
          const prog = simCourse ? getCourseProgress(simCourse.course_id) : null;
          const isCompleted = prog?.completed === true;

          return (
            <Animated.View
              key={dra.id}
              style={[
                styles.courseCard,
                { borderColor: dra.borderColor },
                {
                  opacity: cardsAnim[idx],
                  transform: [
                    {
                      translateY: cardsAnim[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Thumbnail Container */}
              <View style={styles.cardThumbnailBox}>
                <Image source={{ uri: dra.thumbnail }} style={styles.cardImage} />
                <View style={styles.thumbnailGradientOverlay} />

                {/* Badges Overlay */}
                <View style={styles.thumbnailBadgeRow}>
                  <View style={[styles.badgePill, { backgroundColor: dra.badgeBg, borderColor: dra.accentBorder }]}>
                    <Text style={[styles.badgeText, { color: dra.accentText }]}>{dra.subtitle}</Text>
                  </View>
                  {isCompleted && (
                    <View style={styles.completedPill}>
                      <CheckCircle2 size={12} color="#34d399" style={{ marginRight: 4 }} />
                      <Text style={styles.completedText}>COMPLETED</Text>
                    </View>
                  )}
                </View>

                {/* Category Pill Bottom Left */}
                <View style={styles.categoryPillBox}>
                  <View style={[styles.categoryPill, { backgroundColor: dra.accentBg, borderColor: dra.accentBorder }]}>
                    <IconComponent size={12} color={dra.accentText} style={{ marginRight: 6 }} />
                    <Text style={[styles.categoryPillText, { color: dra.accentText }]}>{dra.category}</Text>
                  </View>
                </View>
              </View>

              {/* Content Body */}
              <View style={styles.cardBody}>
                <View>
                  <Text style={styles.cardTitle}>{dra.title}</Text>
                  <Text style={styles.cardDescription}>{dra.description}</Text>
                </View>

                {/* Highlights List */}
                <View style={styles.highlightsBox}>
                  {dra.highlights.map((h) => (
                    <View key={h} style={styles.highlightItem}>
                      <View style={[styles.highlightBullet, { backgroundColor: dra.accentText }]} />
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>

                {/* Audience & Duration */}
                <View style={styles.metaFooterRow}>
                  <View style={styles.audienceBox}>
                    <Users size={12} color={C.text2} style={{ marginRight: 5 }} />
                    <Text style={styles.metaFooterText}>{dra.audience}</Text>
                  </View>
                  <View style={styles.durationBox}>
                    <Clock size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.metaFooterText}>{dra.duration}</Text>
                  </View>
                </View>

                {/* Inline Progress Bar */}
                {prog && prog.watched_percent > 0 && !isCompleted && (
                  <View style={styles.inlineProgressBox}>
                    <View style={styles.inlineProgressLabels}>
                      <Text style={styles.inlineProgressText}>LESSON PROGRESS</Text>
                      <Text style={styles.inlineProgressText}>{prog.watched_percent}%</Text>
                    </View>
                    <View style={styles.inlineTrack}>
                      <View style={[styles.inlineFill, { backgroundColor: dra.accentText, width: `${prog.watched_percent}%` }]} />
                    </View>
                  </View>
                )}

                {/* Action Buttons Frame */}
                <View style={styles.ctaButtonRow}>
                  {simCourse && (
                    <TouchableOpacity
                      onPress={() => startCourseVideo(simCourse)}
                      style={[styles.simLessonBtn, { backgroundColor: dra.accentBg, borderColor: dra.accentBorder }]}
                    >
                      <Play size={10} color={dra.accentText} style={{ marginRight: 6 }} />
                      <Text style={[styles.simLessonBtnText, { color: dra.accentText }]}>
                        {isCompleted ? "Re-watch" : prog && prog.watched_percent > 0 ? "Continue" : "Preview Lesson"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleOpenURL(dra.url)}
                    style={styles.enrollBtn}
                  >
                    <Text style={styles.enrollBtnText}>Enroll on DRA</Text>
                    <ExternalLink size={10} color="#ffffff" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Footer CTA */}
      <View style={styles.footerBanner}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerTitle}>Ready to go further?</Text>
          <Text style={styles.footerSubtitle}>Explore all programmes and cohorts at Digital Risk Academy.</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleOpenURL("https://digitalriskacademy.com/programs")}
          style={styles.footerButton}
        >
          <Text style={styles.footerButtonText}>Browse All Programmes</Text>
          <ArrowRight size={14} color="#020617" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    padding: 0,
    paddingBottom: 40,
    gap: 18,
  },
  heroBanner: {
    position: "relative",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(49,230,255,0.34)",
    backgroundColor: "rgba(10,16,32,0.84)",
    padding: 22,
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.13), 0 0 44px rgba(49,230,255,0.12)",
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(49,230,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(49,230,255,0.32)",
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
    marginRight: 8,
    boxShadow: "0 0 14px rgba(30,230,163,0.85)",
  },
  heroBadgeText: {
    fontSize: 10,
    fontFamily: font.medium,
    color: C.cyan,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 34,
    fontFamily: font.headingHeavy,
    color: C.text0,
    lineHeight: 38,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  heroTitleAccent: {
    color: C.cyan,
  },
  heroDescription: {
    fontSize: 14,
    color: C.text1,
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 680,
    fontFamily: font.regular,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cyan,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
    minHeight: 48,
    boxShadow: "0 16px 34px rgba(49,230,255,0.22)",
  },
  heroButtonText: {
    color: C.ink,
    fontFamily: font.medium,
    fontSize: 13,
    textTransform: "uppercase",
    marginRight: 8,
  },
  videoPlayerContainer: {
    backgroundColor: "rgba(10,16,32,0.92)",
    borderWidth: 1,
    borderColor: "rgba(49,230,255,0.30)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 18px 44px rgba(0,0,0,0.30), 0 0 32px rgba(49,230,255,0.10)",
  },
  videoHeader: {
    flexDirection: "row",
    justifyContent: "space-between", // Fixed from "between"
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    paddingBottom: 12,
    marginBottom: 16,
  },
  videoMetaText: {
    fontSize: 9,
    fontFamily: font.medium,
    color: C.cyan,
    textTransform: "uppercase",
  },
  videoTitle: {
    fontSize: 19,
    fontFamily: font.heading,
    color: C.text0,
    marginTop: 4,
  },
  exitClassroomText: {
    fontSize: 11,
    fontFamily: font.medium,
    color: C.text2,
  },
  videoAspectBox: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000000",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  videoCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 18, 0.74)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  centerNotification: {
    alignItems: "center",
    justifyContent: "center",
  },
  awardCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(49,230,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(49,230,255,0.50)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  certifiedText: {
    fontSize: 16,
    fontFamily: font.heading,
    color: C.text0,
    marginBottom: 4,
  },
  certifiedSubtext: {
    fontSize: 12,
    color: C.text1,
    textAlign: "center",
    marginBottom: 12,
    fontFamily: font.regular,
  },
  rewatchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rewatchText: {
    color: C.text0,
    fontSize: 10,
    fontFamily: font.medium,
  },
  activeLessonText: {
    fontSize: 12,
    fontFamily: font.medium,
    color: C.cyan,
    textTransform: "uppercase",
  },
  instructorText: {
    fontSize: 12,
    color: C.text2,
    marginTop: 4,
    fontFamily: font.regular,
  },
  videoControlsRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(5,8,18,0.94)",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  controlMetaText: {
    fontSize: 10,
    color: C.text2,
    textTransform: "uppercase",
    fontFamily: font.medium,
  },
  controlActionLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  playPauseBtn: {
    backgroundColor: C.green,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 16,
  },
  playPauseBtnText: {
    color: C.ink,
    fontFamily: font.medium,
    fontSize: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: C.bg3,
    borderRadius: 99,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: C.green,
    borderRadius: 99,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: font.heading,
    color: C.text0,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(49,230,255,0.36)",
    marginLeft: 12,
  },
  cardsGrid: {
    flexDirection: "column",
    gap: 16,
  },
  courseCard: {
    backgroundColor: "rgba(10,16,32,0.72)",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    boxShadow: "0 18px 44px rgba(0,0,0,0.27), inset 0 1px 0 rgba(255,255,255,0.10)",
  },
  cardThumbnailBox: {
    height: 190,
    position: "relative",
    backgroundColor: "#020617",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    opacity: 0.68,
  },
  thumbnailGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 18, 0.28)",
  },
  thumbnailBadgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgePill: {
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: font.medium,
    textTransform: "uppercase",
  },
  completedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
  },
  completedText: {
    fontSize: 9,
    fontFamily: font.medium,
    color: "#34d399",
  },
  categoryPillBox: {
    position: "absolute",
    bottom: 12,
    left: 12,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    minHeight: 28,
  },
  categoryPillText: {
    fontSize: 9,
    fontFamily: font.medium,
  },
  cardBody: {
    padding: 18,
    flex: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 23,
    fontFamily: font.heading,
    color: C.text0,
    lineHeight: 27,
  },
  cardDescription: {
    fontSize: 13,
    color: C.text1,
    lineHeight: 20,
    marginTop: 7,
    fontFamily: font.regular,
  },
  highlightsBox: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  highlightBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
    boxShadow: "0 0 10px rgba(255,255,255,0.26)",
  },
  highlightText: {
    fontSize: 12,
    color: C.text1,
    fontFamily: font.regular,
    flex: 1,
  },
  metaFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    gap: 12,
  },
  metaFooterText: {
    fontSize: 11,
    color: C.text2,
    fontFamily: font.medium,
    flexShrink: 1,
  },
  audienceBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  durationBox: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  inlineProgressBox: {
    marginTop: 12,
  },
  inlineProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  inlineProgressText: {
    fontSize: 8,
    color: C.text2,
    fontFamily: font.medium,
  },
  inlineTrack: {
    width: "100%",
    backgroundColor: C.bg3,
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
  },
  inlineFill: {
    height: "100%",
    borderRadius: 99,
  },
  ctaButtonRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 2,
  },
  simLessonBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    minHeight: 44,
  },
  simLessonBtnText: {
    fontSize: 11,
    fontFamily: font.medium,
  },
  enrollBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.075)",
    borderColor: C.border2,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    minHeight: 44,
  },
  enrollBtnText: {
    color: C.text0,
    fontFamily: font.medium,
    fontSize: 11,
  },
  footerBanner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(141,124,255,0.32)",
    backgroundColor: "rgba(10,16,32,0.78)",
    padding: 20,
    flexDirection: "column",
    gap: 16,
    boxShadow: "0 18px 44px rgba(0,0,0,0.28), 0 0 34px rgba(141,124,255,0.10)",
  },
  footerInfo: {
    flexDirection: "column",
  },
  footerTitle: {
    fontSize: 21,
    fontFamily: font.heading,
    color: C.text0,
  },
  footerSubtitle: {
    fontSize: 13,
    color: C.text1,
    marginTop: 2,
    fontFamily: font.regular,
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cyan,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  footerButtonText: {
    color: C.ink,
    fontFamily: font.medium,
    fontSize: 12,
    textTransform: "uppercase",
  },
});
