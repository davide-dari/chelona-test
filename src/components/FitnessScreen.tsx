import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, RefreshCw, Play, Award, 
  TrendingUp, Target, Activity, Heart, Dumbbell, Utensils, ExternalLink, X, Bell, 
  Clock, QrCode, Share2, Users, Copy, CheckCheck, Camera, Sparkles, Scale, ChefHat 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { QrScanner } from './QrScanner';
import { lzw } from '../utils/lzw';
import { Share } from '@capacitor/share';
import { findRecipeForMeal } from '../services/recipeSearchService';
import { notificationService } from '../services/notificationService';

// --- INTERFACES ---

export interface ExerciseTemplate {
  name: string;
  muscleGroup: 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs' | 'full_body';
  equipment: ('gym' | 'home' | 'bands' | 'bodyweight')[];
  compound: boolean;
  gifUrl?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  muscleGroup: string;
  gifUrl?: string;
}

export interface WorkoutDay {
  dayLabel: string;
  focus: string;
  exercises: Exercise[];
  isCompleted: boolean;
}

export interface FitnessProfile {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: string;
  goals?: string[];
  daysPerWeek: number;
  equipment: 'gym' | 'home' | 'bands' | 'bodyweight';
}

export interface MealTemplate {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  restrictions: string[];
  description: string;
  isSimple?: boolean;
  recipeUrl?: string;
}

export interface Meal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time?: string;
  notificationsEnabled?: boolean;
  isSimple?: boolean;
  recipeUrl?: string;
}

export interface MealDay {
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface DietProfile {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  activityLevel: 'sedentary' | 'light' | 'active' | 'very_active';
  goal: string;
  goals?: string[];
  restrictions: string[];
  mealsPerDay: number;
}

export interface FitnessModule {
  id: string;
  type: 'fitness';
  title: string;
  fitnessProfile?: FitnessProfile;
  workoutPlan?: WorkoutDay[];
  dietProfile?: DietProfile;
  mealPlan?: MealDay;
  mealPlanWeekly?: MealDay[];
  bmr?: number;
  tdee?: number;
  targetCalories?: number;
  partnerName?: string;
  partnerFitnessProfile?: FitnessProfile;
  partnerWorkoutPlan?: WorkoutDay[];
  partnerDietProfile?: DietProfile;
  partnerMealPlanWeekly?: MealDay[];
  partnerBmr?: number;
  partnerTdee?: number;
  partnerTargetCalories?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  folderId?: string;
}

interface FitnessScreenProps {
  module: FitnessModule;
  onClose: () => void;
  onSave: (m: FitnessModule) => void;
}

// --- DATA: EXERCISE LIBRARY ---
const EXERCISE_LIBRARY: ExerciseTemplate[] = [
  // Chest
  { name: 'Panca Piana con Bilanciere', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0025-bT4zM8X.gif', compound: true },
  { name: 'Panca Inclinata con Manubri', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0314-YJ2sTsm.gif', compound: true },
  { name: 'Croci ai Cavi', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0171-tBWXbIT.gif', compound: false },
  { name: 'Chest Press', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0009-PAgTVaK.gif', compound: true },
  { name: 'Push-up', muscleGroup: 'chest', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-I4hDWkc.gif', compound: true },
  { name: 'Push-up Diamante', muscleGroup: 'chest', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0283-soIB2rj.gif', compound: true },
  { name: 'Dip alle Parallele', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0009-PAgTVaK.gif', compound: true },
  { name: 'Panca Declinata', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0033-tP9bF0c.gif', compound: true },
  { name: 'Croci con Manubri', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0308-K1tX1bZ.gif', compound: false },
  { name: 'Pectoral Machine', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1716-RoV1Rfa.gif', compound: false },
  // Back
  { name: 'Trazioni alla Sbarra', muscleGroup: 'back', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0652-6l0K93g.gif', compound: true },
  { name: 'Lat Machine', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2400-0rHfvy9.gif', compound: true },
  { name: 'Rematore con Bilanciere', muscleGroup: 'back', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0027-eZyBC3j.gif', compound: true },
  { name: 'Rematore con Manubrio', muscleGroup: 'back', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0293-BJ0Hz5L.gif', compound: true },
  { name: 'Pulley Basso', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0180-hvV79Si.gif', compound: true },
  { name: 'T-Bar Row', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1349-BgljGjd.gif', compound: true },
  { name: 'Pull-up Presa Larga', muscleGroup: 'back', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1429-Qqi7bko.gif', compound: true },
  { name: 'Rematore ai Cavi', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0159-kesXOpB.gif', compound: true },
  { name: 'Pullover con Manubrio', muscleGroup: 'back', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0375-9XjtHvS.gif', compound: false },
  { name: 'Australian Pull-up', muscleGroup: 'back', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0499-bZGHsAZ.gif', compound: true },
  // Shoulders
  { name: 'Military Press con Bilanciere', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0086-ngPpyRS.gif', compound: true },
  { name: 'Alzate Laterali', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0977-sTg7iys.gif', compound: false },
  { name: 'Arnold Press', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2137-Xy4jlWA.gif', compound: true },
  { name: 'Face Pull', muscleGroup: 'shoulders', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0007-4IKbhHV.gif', compound: false },
  { name: 'Alzate Frontali', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0978-TFA88iB.gif', compound: false },
  { name: 'Shoulder Press con Manubri', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0361-84RyJf8.gif', compound: true },
  { name: 'Tirate al Mento', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0120-UDlhcO8.gif', compound: true },
  { name: 'Alzate a 90 Gradi', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0993-sTfvVsG.gif', compound: false },
  { name: 'Lateral Raise al Cavo', muscleGroup: 'shoulders', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0178-goJ6ezq.gif', compound: false },
  // Biceps
  { name: 'Curl con Bilanciere', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0031-25GPyDY.gif', compound: false },
  { name: 'Curl con Manubri', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0285-BU15nH4.gif', compound: false },
  { name: 'Curl Martello', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0165-HPlPoQA.gif', compound: false },
  { name: 'Curl Concentrato', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0976-kmVVAfu.gif', compound: false },
  { name: 'Curl alla Panca Scott', muscleGroup: 'biceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0059-SYJ4Bkt.gif', compound: false },
  { name: 'Curl ai Cavi', muscleGroup: 'biceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0868-G08RZcQ.gif', compound: false },
  { name: 'Curl Inverso', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0080-xNrS20v.gif', compound: false },
  // Triceps
  { name: 'French Press', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1736-ziFKQXP.gif', compound: false },
  { name: 'Push-down ai Cavi', muscleGroup: 'triceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2406-ThKP69G.gif', compound: false },
  { name: 'Dip su Panca', muscleGroup: 'triceps', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0129-RrLske5.gif', compound: true },
  { name: 'Tricipiti ai Cavi con Corda', muscleGroup: 'triceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0149-Gchi5Tr.gif', compound: false },
  { name: 'Kickback con Manubrio', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0333-W6PxUkg.gif', compound: false },
  { name: 'Estensioni Overhead', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0092-5uFK1xr.gif', compound: false },
  { name: 'Skull Crusher', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0060-h8LFzo9.gif', compound: false },
  // Quads
  { name: 'Squat con Bilanciere', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0102-oR7O9LW.gif', compound: true },
  { name: 'Pressa', muscleGroup: 'quads', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2287-V07qpXy.gif', compound: true },
  { name: 'Leg Extension', muscleGroup: 'quads', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0585-my33uHU.gif', compound: false },
  { name: 'Affondi con Manubri', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0336-RRWFUcw.gif', compound: true },
  { name: 'Squat Frontale', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0024-Y7YcmIJ.gif', compound: true },
  { name: 'Hack Squat', muscleGroup: 'quads', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0046-5VCj6iH.gif', compound: true },
  { name: 'Goblet Squat', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1760-yn8yg1r.gif', compound: true },
  { name: 'Squat a Corpo Libero', muscleGroup: 'quads', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3168-3xK09Sk.gif', compound: true },
  { name: 'Sissy Squat', muscleGroup: 'quads', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1489-xdYPUtE.gif', compound: false },
  // Hamstrings
  { name: 'Stacco Rumeno', muscleGroup: 'hamstrings', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0085-wQ2c4XD.gif', compound: true },
  { name: 'Leg Curl Sdraiato', muscleGroup: 'hamstrings', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0586-17lJ1kr.gif', compound: false },
  { name: 'Leg Curl Seduto', muscleGroup: 'hamstrings', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0599-Zg3XY7P.gif', compound: false },
  { name: 'Stacco a Gamba Singola', muscleGroup: 'hamstrings', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1756-gEyURal.gif', compound: true },
  { name: 'Nordic Curl', muscleGroup: 'hamstrings', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3235-zHEpuuc.gif', compound: true },
  { name: 'Good Morning', muscleGroup: 'hamstrings', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0044-XlZ4lAC.gif', compound: true },
  // Glutes
  { name: 'Hip Thrust con Bilanciere', muscleGroup: 'glutes', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3236-Pjbc0Kt.gif', compound: true },
  { name: 'Ponte Glutei', muscleGroup: 'glutes', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1409-qKBpF7I.gif', compound: true },
  { name: 'Squat Sumo', muscleGroup: 'glutes', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3142-dzz6BiV.gif', compound: true },
  { name: 'Kick-back ai Cavi', muscleGroup: 'glutes', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0980-wSScovH.gif', compound: false },
  { name: 'Step-up', muscleGroup: 'glutes', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1008-d5bTEPV.gif', compound: true },
  { name: 'Abduzioni', muscleGroup: 'glutes', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3006-0xDpB4L.gif', compound: false },
  { name: 'Hip Thrust a Corpo Libero', muscleGroup: 'glutes', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3236-Pjbc0Kt.gif', compound: true },
  // Calves
  { name: 'Calf Raise in Piedi', muscleGroup: 'calves', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1372-8ozhUIZ.gif', compound: false },
  { name: 'Calf Raise Seduto', muscleGroup: 'calves', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0088-ktsFQAZ.gif', compound: false },
  { name: 'Calf Raise su Gradino', muscleGroup: 'calves', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0999.gif', compound: false },
  { name: 'Calf Raise alla Pressa', muscleGroup: 'calves', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1385.gif', compound: false },
  // Abs
  { name: 'Crunch', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0972-tZkGYZ9.gif', compound: false },
  { name: 'Plank', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3544-5VXmnV5.gif', compound: true },
  { name: 'Leg Raise', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0012-UGhRD1A.gif', compound: false },
  { name: 'Russian Twist', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0014-r7cT9YD.gif', compound: false },
  { name: 'Mountain Climber', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2466-9c6T1YX.gif', compound: true },
  { name: 'Bicycle Crunch', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0972-tZkGYZ9.gif', compound: false },
  { name: 'Ab Wheel', muscleGroup: 'abs', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0971-zhF9lW4.gif', compound: true },
  { name: 'Crunch Inverso', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0972-tZkGYZ9.gif', compound: false },
  { name: 'V-up', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0969-ztAa1RK.gif', compound: false },
  { name: 'Dead Bug', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0276.gif', compound: false },
  // Full Body
  { name: 'Burpee', muscleGroup: 'full_body', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1160-dK9394r.gif', compound: true },
  { name: 'Clean and Press', muscleGroup: 'full_body', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0028-SGY8Zui.gif', compound: true },
  { name: 'Thruster', muscleGroup: 'full_body', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3305-f7Y9eDZ.gif', compound: true },
  { name: 'Turkish Get-up', muscleGroup: 'full_body', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0551-Ha7SZ3y.gif', compound: true },
  { name: 'Bear Crawl', muscleGroup: 'full_body', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2466-9c6T1YX.gif', compound: true },
  // Esercizi con Elastici & Mini-Band
  { name: 'Chest Press con Elastico', muscleGroup: 'chest', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3124-4x5Okof.gif', compound: true },
  { name: 'Croci con Elastico', muscleGroup: 'chest', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0989-c16nYGA.gif', compound: false },
  { name: 'Rematore con Elastico', muscleGroup: 'back', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0988-km0sQC0.gif', compound: true },
  { name: 'Lat Pulldown con Elastico', muscleGroup: 'back', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0974-DptumMx.gif', compound: true },
  { name: 'Face Pull con Elastico', muscleGroup: 'shoulders', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0970-r1XNRYB.gif', compound: false },
  { name: 'Alzate Laterali con Elastico', muscleGroup: 'shoulders', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0977-sTg7iys.gif', compound: false },
  { name: 'Shoulder Press con Elastico', muscleGroup: 'shoulders', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0997-peAeMR3.gif', compound: true },
  { name: 'Curl Bicipiti con Elastico', muscleGroup: 'biceps', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0968-3omWx6P.gif', compound: false },
  { name: 'Pushdown Tricipiti con Elastico', muscleGroup: 'triceps', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0998-obe5LMq.gif', compound: false },
  { name: 'Squat con Elastico', muscleGroup: 'quads', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1004-TUZLh71.gif', compound: true },
  { name: 'Hip Thrust con Mini-Band', muscleGroup: 'glutes', equipment: ['bands', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3236-Pjbc0Kt.gif', compound: true },
  { name: 'Abduzioni Glutei con Mini-Band', muscleGroup: 'glutes', equipment: ['bands', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3006-0xDpB4L.gif', compound: false },
  { name: 'Glute Kickback con Elastico', muscleGroup: 'glutes', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0980-wSScovH.gif', compound: false },
  { name: 'Stacco Rumeno con Elastico', muscleGroup: 'hamstrings', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1009-kuMiR2T.gif', compound: true }
];

// --- DATA: MEAL LIBRARY ---
const MEAL_LIBRARY: MealTemplate[] = [
  // Breakfast
  { name: 'Porridge di Avena con Banana e Miele', type: 'breakfast', baseCalories: 400, baseProtein: 15, baseCarbs: 65, baseFat: 8, restrictions: ['vegetarian'], description: 'Avena, latte, banana e miele.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Porridge.html' },
  { name: 'Yogurt Greco con Frutta Secca e Mirtilli', type: 'breakfast', baseCalories: 350, baseProtein: 20, baseCarbs: 30, baseFat: 15, restrictions: ['vegetarian', 'gluten-free'], description: 'Yogurt greco intero con noci e mirtilli freschi.', isSimple: true },
  { name: 'Uova Strapazzate con Pane Integrale', type: 'breakfast', baseCalories: 450, baseProtein: 25, baseCarbs: 35, baseFat: 20, restrictions: ['vegetarian'], description: '3 uova, 2 fette di pane integrale tostato.', isSimple: true },
  { name: 'Pancake Proteici con Sciroppo d\'Acero', type: 'breakfast', baseCalories: 380, baseProtein: 30, baseCarbs: 45, baseFat: 6, restrictions: ['vegetarian'], description: 'Pancake fatti con avena e proteine in polvere.', isSimple: false },
  { name: 'Toast Avocado e Uovo', type: 'breakfast', baseCalories: 420, baseProtein: 18, baseCarbs: 30, baseFat: 24, restrictions: ['vegetarian'], description: 'Pane integrale, mezzo avocado, 1 uovo in camicia.', isSimple: true },
  { name: 'Smoothie Proteico alla Frutta', type: 'breakfast', baseCalories: 300, baseProtein: 25, baseCarbs: 40, baseFat: 4, restrictions: ['vegetarian', 'gluten-free'], description: 'Latte, proteine whey, banana e frutti di bosco.', isSimple: true },
  { name: 'Fette Biscottate con Marmellata e Ricotta', type: 'breakfast', baseCalories: 320, baseProtein: 12, baseCarbs: 50, baseFat: 8, restrictions: ['vegetarian'], description: '4 fette biscottate integrali, ricotta fresca e marmellata.', isSimple: true },
  { name: 'Bowl di Acai', type: 'breakfast', baseCalories: 360, baseProtein: 8, baseCarbs: 60, baseFat: 10, restrictions: ['vegetarian', 'vegan'], description: 'Acai, granola, cocco e frutta fresca.', isSimple: true },
  { name: 'Müsli con Latte di Mandorla', type: 'breakfast', baseCalories: 340, baseProtein: 10, baseCarbs: 55, baseFat: 12, restrictions: ['vegetarian', 'vegan'], description: 'Müsli croccante con latte vegetale.', isSimple: true },
  
  // Lunch
  { name: 'Petto di Pollo alla Griglia con Riso Basmati', type: 'lunch', baseCalories: 600, baseProtein: 45, baseCarbs: 70, baseFat: 10, restrictions: ['gluten-free', 'lactose-free'], description: 'Pollo alla griglia, riso basmati e un filo d\'olio EVO.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Petto-di-pollo-in-padella.html' },
  { name: 'Pasta Integrale al Tonno', type: 'lunch', baseCalories: 650, baseProtein: 35, baseCarbs: 85, baseFat: 15, restrictions: ['lactose-free'], description: 'Pasta integrale con tonno al naturale e pomodorini.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Spaghetti-al-tonno.html' },
  { name: 'Insalatona con Quinoa e Feta', type: 'lunch', baseCalories: 550, baseProtein: 20, baseCarbs: 60, baseFat: 25, restrictions: ['vegetarian', 'gluten-free'], description: 'Quinoa, feta, pomodorini, olive e cetrioli.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Insalata-di-quinoa.html' },
  { name: 'Bowl di Riso con Salmone e Avocado', type: 'lunch', baseCalories: 700, baseProtein: 35, baseCarbs: 65, baseFat: 30, restrictions: ['gluten-free', 'lactose-free'], description: 'Riso da sushi, salmone crudo, avocado e salsa di soia.', isSimple: true },
  { name: 'Wrap Integrale con Tacchino', type: 'lunch', baseCalories: 500, baseProtein: 35, baseCarbs: 50, baseFat: 15, restrictions: ['lactose-free'], description: 'Piadina integrale, fesa di tacchino, insalata e maionese leggera.', isSimple: true },
  { name: 'Pasta con Ragù di Lenticchie', type: 'lunch', baseCalories: 620, baseProtein: 25, baseCarbs: 90, baseFat: 12, restrictions: ['vegetarian', 'vegan'], description: 'Pasta integrale con sugo di pomodoro e lenticchie.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Ragu-di-lenticchie.html' },
  { name: 'Poke Bowl con Riso e Edamame', type: 'lunch', baseCalories: 580, baseProtein: 25, baseCarbs: 75, baseFat: 18, restrictions: ['vegetarian', 'vegan'], description: 'Riso, edamame, tofu marinato, carote e cavolo rosso.', isSimple: false },
  { name: 'Risotto ai Funghi', type: 'lunch', baseCalories: 600, baseProtein: 15, baseCarbs: 85, baseFat: 20, restrictions: ['vegetarian', 'gluten-free'], description: 'Riso Carnaroli con funghi porcini e parmigiano.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Risotto-ai-funghi.html' },
  { name: 'Couscous con Verdure Grigliate e Ceci', type: 'lunch', baseCalories: 550, baseProtein: 20, baseCarbs: 80, baseFat: 15, restrictions: ['vegetarian', 'vegan'], description: 'Couscous integrale con verdure miste e ceci.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Couscous-alle-verdure.html' },

  // Dinner
  { name: 'Salmone al Forno con Patate Dolci', type: 'dinner', baseCalories: 650, baseProtein: 40, baseCarbs: 50, baseFat: 28, restrictions: ['gluten-free', 'lactose-free'], description: 'Trancio di salmone al forno, patate dolci arrosto.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Salmone-al-forno.html' },
  { name: 'Petto di Tacchino con Verdure al Vapore', type: 'dinner', baseCalories: 450, baseProtein: 45, baseCarbs: 20, baseFat: 18, restrictions: ['gluten-free', 'lactose-free'], description: 'Tacchino ai ferri con broccoli e carote al vapore, olio EVO.', isSimple: true },
  { name: 'Omelette con Spinaci e Feta', type: 'dinner', baseCalories: 400, baseProtein: 25, baseCarbs: 10, baseFat: 28, restrictions: ['vegetarian', 'gluten-free'], description: '3 uova sbattute con spinaci freschi e formaggio feta.', isSimple: true },
  { name: 'Merluzzo al Cartoccio con Zucchine', type: 'dinner', baseCalories: 420, baseProtein: 35, baseCarbs: 15, baseFat: 20, restrictions: ['gluten-free', 'lactose-free'], description: 'Filetto di merluzzo cotto al forno con zucchine e pomodorini.', isSimple: true },
  { name: 'Pollo al Curry con Riso', type: 'dinner', baseCalories: 680, baseProtein: 45, baseCarbs: 75, baseFat: 20, restrictions: ['gluten-free'], description: 'Bocconcini di pollo al curry con latte di cocco e riso basmati.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Pollo-al-curry.html' },
  { name: 'Hamburger di Tacchino con Insalata', type: 'dinner', baseCalories: 500, baseProtein: 40, baseCarbs: 35, baseFat: 20, restrictions: ['lactose-free'], description: 'Hamburger di tacchino fatto in casa, panino integrale, abbondante insalata.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Hamburger-di-tacchino.html' },
  { name: 'Zuppa di Legumi', type: 'dinner', baseCalories: 450, baseProtein: 25, baseCarbs: 65, baseFat: 10, restrictions: ['vegetarian', 'vegan', 'gluten-free'], description: 'Zuppa calda di ceci, fagioli e lenticchie con crostini.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Zuppa-di-legumi-e-cereali.html' },
  { name: 'Filetto di Orata con Ratatouille', type: 'dinner', baseCalories: 480, baseProtein: 38, baseCarbs: 25, baseFat: 22, restrictions: ['gluten-free', 'lactose-free'], description: 'Orata al forno con mix di verdure in padella.', isSimple: false, recipeUrl: 'https://ricette.giallozafferano.it/Orata-al-forno.html' },
  { name: 'Tofu Saltato con Verdure e Riso', type: 'dinner', baseCalories: 550, baseProtein: 25, baseCarbs: 70, baseFat: 18, restrictions: ['vegetarian', 'vegan', 'gluten-free'], description: 'Tofu marinato saltato con verdure croccanti e riso.', isSimple: false },

  // Snacks
  { name: 'Mix di Frutta Secca', type: 'snack', baseCalories: 200, baseProtein: 5, baseCarbs: 8, baseFat: 18, restrictions: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free'], description: 'Noci, mandorle e nocciole (circa 30g).', isSimple: true },
  { name: 'Barretta Proteica Fatta in Casa', type: 'snack', baseCalories: 250, baseProtein: 15, baseCarbs: 30, baseFat: 8, restrictions: ['vegetarian'], description: 'Barretta con avena, burro di arachidi e proteine.', isSimple: false },
  { name: 'Mela con Burro di Arachidi', type: 'snack', baseCalories: 220, baseProtein: 6, baseCarbs: 25, baseFat: 12, restrictions: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free'], description: 'Una mela media tagliata a fette con un cucchiaio di burro di arachidi.', isSimple: true },
  { name: 'Crackers Integrali con Hummus', type: 'snack', baseCalories: 240, baseProtein: 8, baseCarbs: 30, baseFat: 10, restrictions: ['vegetarian', 'vegan', 'lactose-free'], description: 'Crackers di segale con hummus di ceci.', isSimple: true },
  { name: 'Cottage Cheese con Miele', type: 'snack', baseCalories: 180, baseProtein: 18, baseCarbs: 15, baseFat: 6, restrictions: ['vegetarian', 'gluten-free'], description: 'Fiocchi di latte con un cucchiaino di miele.', isSimple: true },
  { name: 'Banana con Cioccolato Fondente', type: 'snack', baseCalories: 200, baseProtein: 3, baseCarbs: 35, baseFat: 7, restrictions: ['vegetarian', 'vegan', 'gluten-free'], description: 'Una banana con 15g di cioccolato fondente >75%.', isSimple: true },
  { name: 'Edamame', type: 'snack', baseCalories: 150, baseProtein: 12, baseCarbs: 10, baseFat: 6, restrictions: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free'], description: 'Baccelli di soia bolliti e salati.', isSimple: true },
  { name: 'Carote con Guacamole', type: 'snack', baseCalories: 180, baseProtein: 3, baseCarbs: 15, baseFat: 14, restrictions: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free'], description: 'Bastoncini di carota cruda con salsa guacamole.', isSimple: true }
];

// --- LOGIC: WORKOUT GENERATOR ---

function getExercises(equipment: ('gym' | 'home' | 'bands' | 'bodyweight'), muscleGroups: string[], count: number, preferCompound: boolean): ExerciseTemplate[] {
  let filtered = EXERCISE_LIBRARY.filter(e => {
    if (!muscleGroups.includes(e.muscleGroup)) return false;
    if (equipment === 'bands') {
      return e.equipment.includes('bands') || e.equipment.includes('bodyweight');
    }
    return e.equipment.includes(equipment);
  });
  
  if (preferCompound) {
    const compound = filtered.filter(e => e.compound);
    const isolation = filtered.filter(e => !e.compound);
    
    const result: ExerciseTemplate[] = [];
    compound.sort(() => 0.5 - Math.random());
    isolation.sort(() => 0.5 - Math.random());
    
    const compoundCount = Math.min(Math.ceil(count * 0.7), compound.length);
    result.push(...compound.slice(0, compoundCount));
    
    const isolationCount = count - compoundCount;
    if (isolationCount > 0 && isolation.length > 0) {
      result.push(...isolation.slice(0, isolationCount));
    } else if (result.length < count && compound.length > compoundCount) {
      result.push(...compound.slice(compoundCount, count));
    }
    
    return result;
  } else {
    filtered.sort(() => 0.5 - Math.random());
    return filtered.slice(0, count);
  }
}

function getSetsAndReps(goal: string): { sets: number, reps: string, rest: string } {
  switch (goal) {
    case 'mass': return { sets: 4, reps: '8-10', rest: '90s' };
    case 'cut': return { sets: 3, reps: '12-15', rest: '60s' };
    case 'strength': return { sets: 5, reps: '5', rest: '120s' };
    case 'endurance': return { sets: 3, reps: '15-20', rest: '45s' };
    case 'tone': return { sets: 3, reps: '12-15', rest: '60s' };
    default: return { sets: 3, reps: '10', rest: '60s' };
  }
}

function generateWorkoutPlan(profile: FitnessProfile): WorkoutDay[] {
  const plan: WorkoutDay[] = [];
  
  const exCount = profile.level === 'beginner' ? 4 : profile.level === 'intermediate' ? 5 : 6;
  const scheme = getSetsAndReps(profile.goal);

  const createDay = (label: string, focus: string, muscleGroups: string[]): WorkoutDay => {
    const templates = getExercises(profile.equipment, muscleGroups, exCount, true);
    const exercises: Exercise[] = templates.map(t => ({
      name: t.name,
      sets: scheme.sets,
      reps: scheme.reps,
      rest: scheme.rest,
      muscleGroup: t.muscleGroup,
      gifUrl: t.gifUrl
    }));
    return { dayLabel: label, focus, exercises, isCompleted: false };
  };

  if (profile.daysPerWeek === 2) {
    plan.push(createDay('Giorno 1', 'Full Body A', ['chest', 'back', 'legs', 'shoulders', 'abs']));
    plan.push(createDay('Giorno 2', 'Full Body B', ['chest', 'back', 'legs', 'shoulders', 'abs']));
  } else if (profile.daysPerWeek === 3) {
    plan.push(createDay('Giorno 1', 'Push', ['chest', 'shoulders', 'triceps']));
    plan.push(createDay('Giorno 2', 'Pull', ['back', 'biceps']));
    plan.push(createDay('Giorno 3', 'Legs', ['quads', 'hamstrings', 'glutes', 'calves', 'abs']));
  } else if (profile.daysPerWeek === 4) {
    plan.push(createDay('Giorno 1', 'Upper A', ['chest', 'back', 'shoulders', 'biceps', 'triceps']));
    plan.push(createDay('Giorno 2', 'Lower A', ['quads', 'hamstrings', 'glutes', 'calves', 'abs']));
    plan.push(createDay('Giorno 3', 'Upper B', ['chest', 'back', 'shoulders', 'biceps', 'triceps']));
    plan.push(createDay('Giorno 4', 'Lower B', ['quads', 'hamstrings', 'glutes', 'calves', 'abs']));
  } else if (profile.daysPerWeek === 5) {
    plan.push(createDay('Giorno 1', 'Petto e Tricipiti', ['chest', 'triceps']));
    plan.push(createDay('Giorno 2', 'Schiena e Bicipiti', ['back', 'biceps']));
    plan.push(createDay('Giorno 3', 'Gambe', ['quads', 'hamstrings', 'glutes', 'calves']));
    plan.push(createDay('Giorno 4', 'Spalle e Addome', ['shoulders', 'abs']));
    plan.push(createDay('Giorno 5', 'Full Body', ['chest', 'back', 'legs']));
  } else {
    plan.push(createDay('Giorno 1', 'Push A', ['chest', 'shoulders', 'triceps']));
    plan.push(createDay('Giorno 2', 'Pull A', ['back', 'biceps']));
    plan.push(createDay('Giorno 3', 'Legs A', ['quads', 'hamstrings', 'glutes', 'calves', 'abs']));
    plan.push(createDay('Giorno 4', 'Push B', ['chest', 'shoulders', 'triceps']));
    plan.push(createDay('Giorno 5', 'Pull B', ['back', 'biceps']));
    plan.push(createDay('Giorno 6', 'Legs B', ['quads', 'hamstrings', 'glutes', 'calves', 'abs']));
  }

  return plan;
}

// --- LOGIC: SCIENTIFIC DIET GENERATOR (Mifflin-St Jeor 1990) ---

function calculateBMR(profile: DietProfile): number {
  if (profile.gender === 'male') {
    // Mifflin-St Jeor Uomini: (10 × kg) + (6.25 × cm) - (5 × anni) + 5
    return (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
  } else {
    // Mifflin-St Jeor Donne: (10 × kg) + (6.25 × cm) - (5 × anni) - 161
    return (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
  }
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  switch (activityLevel) {
    case 'sedentary': return bmr * 1.15;   // Sedentario / Lavoro d'ufficio
    case 'light': return bmr * 1.25;       // Leggero (1-2 allenamenti/sett)
    case 'active': return bmr * 1.40;      // Moderato (3-4 allenamenti/sett)
    case 'very_active': return bmr * 1.60; // Intenso (5+ allenamenti/sett)
    default: return bmr * 1.15;
  }
}

function getMealsByType(type: 'breakfast' | 'lunch' | 'dinner' | 'snack', restrictions: string[]): MealTemplate[] {
  return MEAL_LIBRARY.filter(m => {
    if (m.type !== type) return false;
    for (const res of restrictions) {
      if (!m.restrictions.includes(res)) return false;
    }
    return true;
  });
}

function generateMealPlanWeekly(profile: DietProfile, targetCalories: number): MealDay[] {
  const macros = {
    protein: profile.goal === 'bulk' ? profile.weight * 2.2 : profile.weight * 2.0,
    fat: (targetCalories * 0.25) / 9,
    carbs: 0
  };
  const remainingCals = targetCalories - (macros.protein * 4) - (macros.fat * 9);
  macros.carbs = remainingCals / 4;

  const usedMeals = new Set<string>();
  const week: MealDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const mealDay: MealDay = {
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    };

    const addMeal = (type: 'breakfast' | 'lunch' | 'dinner' | 'snack', targetCalFraction: number) => {
      const options = getMealsByType(type, profile.restrictions);
      if (options.length === 0) return;
      
      let unusedOptions = options.filter(m => !usedMeals.has(m.name));
      if (unusedOptions.length === 0) {
        options.forEach(m => usedMeals.delete(m.name));
        unusedOptions = options;
      }
      
      const template = unusedOptions[Math.floor(Math.random() * unusedOptions.length)];
      usedMeals.add(template.name);
      
      const scale = (targetCalories * targetCalFraction) / template.baseCalories;
      const meal: Meal = {
        name: template.name,
        description: template.description,
        calories: Math.round(template.baseCalories * scale),
        protein: Math.round(template.baseProtein * scale),
        carbs: Math.round(template.baseCarbs * scale),
        fat: Math.round(template.baseFat * scale),
        isSimple: template.isSimple,
        recipeUrl: template.recipeUrl
      };
      mealDay.meals.push(meal);
      mealDay.totalCalories += meal.calories;
      mealDay.totalProtein += meal.protein;
      mealDay.totalCarbs += meal.carbs;
      mealDay.totalFat += meal.fat;
    };

    if (profile.mealsPerDay === 3) {
      addMeal('breakfast', 0.25);
      addMeal('lunch', 0.40);
      addMeal('dinner', 0.35);
    } else if (profile.mealsPerDay === 4) {
      addMeal('breakfast', 0.25);
      addMeal('lunch', 0.35);
      addMeal('snack', 0.10);
      addMeal('dinner', 0.30);
    } else {
      addMeal('breakfast', 0.20);
      addMeal('snack', 0.10);
      addMeal('lunch', 0.30);
      addMeal('snack', 0.10);
      addMeal('dinner', 0.30);
    }
    
    week.push(mealDay);
  }

  return week;
}

/**
 * Adatta e ricalcola proporzionalmente le calorie e i macronutrienti di una dieta
 * su un target calorico differente, mantenendo esattamente le stesse ricette e piatti.
 */
function adaptMealPlanToCalories(sourcePlan: MealDay[], targetCalories: number): MealDay[] {
  return sourcePlan.map(day => {
    const dayTotal = day.totalCalories || 1;
    const factor = targetCalories / dayTotal;
    const scaledMeals: Meal[] = day.meals.map(m => {
      const scaledCal = Math.max(20, Math.round(m.calories * factor));
      const scaledProt = Math.max(1, Math.round(m.protein * factor));
      const scaledCarbs = Math.max(1, Math.round(m.carbs * factor));
      const scaledFat = Math.max(1, Math.round(m.fat * factor));
      return {
        ...m,
        calories: scaledCal,
        protein: scaledProt,
        carbs: scaledCarbs,
        fat: scaledFat
      };
    });
    return {
      meals: scaledMeals,
      totalCalories: scaledMeals.reduce((acc, m) => acc + m.calories, 0),
      totalProtein: scaledMeals.reduce((acc, m) => acc + m.protein, 0),
      totalCarbs: scaledMeals.reduce((acc, m) => acc + m.carbs, 0),
      totalFat: scaledMeals.reduce((acc, m) => acc + m.fat, 0)
    };
  });
}

// --- SAFE QR CODE COMPONENT ---

class SafeQRCode extends React.Component<{ value: string; size: number; level: 'L' | 'M' | 'Q' | 'H' }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn('SafeQRCode caught rendering error (e.g. data too long):', error);
  }
  componentDidUpdate(prevProps: any) {
    if (prevProps.value !== this.props.value && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError || this.props.value.length > 2100) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-[260px] bg-amber-500/10 border border-amber-500/25 rounded-2xl">
          <Share2 className="w-10 h-10 text-amber-500 mb-2.5 animate-pulse" />
          <p className="text-xs font-black text-[var(--text-main)] mb-1">Piano Molto Dettagliato</p>
          <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">
            I dati completi sono troppo ricchi per un QR code. Condividili istantaneamente toccando <b>"Invia ad App"</b> o <b>"Copia Codice"</b> qui sotto!
          </p>
        </div>
      );
    }
    return (
      <QRCodeSVG 
        value={this.props.value} 
        size={this.props.size} 
        level={this.props.level} 
        includeMargin={false}
      />
    );
  }
}

// --- MAIN COMPONENT ---

export function FitnessScreen({ module, onClose, onSave }: FitnessScreenProps) {
  const [formData, setFormData] = useState<FitnessModule>({
    ...module,
    title: module.title || 'Fitness & Dieta',
    type: 'fitness'
  });

  const [currentView, setCurrentView] = useState<'catalog' | 'fitness-wizard' | 'diet-wizard' | 'fitness-plan' | 'diet-plan'>('catalog');
  
  // Wizards state
  const [fitWizardStep, setFitWizardStep] = useState(1);
  const [dietWizardStep, setDietWizardStep] = useState(1);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null);
  const [enlargedGifUrl, setEnlargedGifUrl] = useState<string | null>(null);
  const [swappingMealInfo, setSwappingMealInfo] = useState<{ dayIndex: number; mealIndex: number; meal: Meal } | null>(null);

  // Partner & Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSubtype, setShareSubtype] = useState<'all' | 'diet' | 'workout'>('diet');
  const [hasCopiedShareCode, setHasCopiedShareCode] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [isScanningPartnerQr, setIsScanningPartnerQr] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [parsedIncomingData, setParsedIncomingData] = useState<any | null>(null);
  const [customScaleCalories, setCustomScaleCalories] = useState<number>(
    formData.targetCalories || 1800
  );
  const [partnerDisplayName, setPartnerDisplayName] = useState<string>(
    formData.partnerName || 'Partner'
  );
  
  // View mode in Diet plan: 'me' | 'partner' | 'couple'
  const [dietViewMode, setDietViewMode] = useState<'me' | 'partner' | 'couple'>(
    formData.partnerMealPlanWeekly ? 'couple' : 'me'
  );
  // View mode in Workout plan: 'me' | 'partner'
  const [workoutViewMode, setWorkoutViewMode] = useState<'me' | 'partner'>('me');
  const [partnerToastMsg, setPartnerToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (partnerToastMsg) {
      const timer = setTimeout(() => setPartnerToastMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [partnerToastMsg]);

  // Genera il payload condivisibile (ultra-ottimizzato senza stringhe pesanti per massima densità QR)
  const sharePayload = useMemo(() => {
    const dataToSend: any = {
      title: formData.title || 'Fitness & Dieta',
    };

    if (shareSubtype === 'diet' || shareSubtype === 'all') {
      if (formData.dietProfile) dataToSend.dietProfile = formData.dietProfile;
      if (formData.targetCalories) dataToSend.targetCalories = formData.targetCalories;
      if (formData.bmr) dataToSend.bmr = formData.bmr;
      if (formData.tdee) dataToSend.tdee = formData.tdee;
      if (formData.mealPlanWeekly) {
        // Rimuoviamo description, recipeUrl e campi ridondanti:
        // Vengono reidratati all'importazione usando MEAL_LIBRARY!
        dataToSend.mealPlanWeekly = formData.mealPlanWeekly.map(day => ({
          meals: day.meals.map(m => ({
            name: m.name,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            time: m.time
          }))
        }));
      }
    }

    if (shareSubtype === 'workout' || shareSubtype === 'all') {
      if (formData.fitnessProfile) dataToSend.fitnessProfile = formData.fitnessProfile;
      if (formData.workoutPlan) {
        // Rimuoviamo gifUrl (link github molto lunghi) per non eccedere la capacità del QR:
        // Vengono reidratati all'importazione usando EXERCISE_LIBRARY!
        dataToSend.workoutPlan = formData.workoutPlan.map(day => ({
          dayLabel: day.dayLabel,
          focus: day.focus,
          exercises: day.exercises.map(e => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            rest: e.rest,
            muscleGroup: e.muscleGroup
          }))
        }));
      }
    }

    const payload = {
      t: 'shared_fitness',
      subtype: shareSubtype,
      v: 1,
      d: dataToSend
    };

    return lzw.compress(JSON.stringify(payload));
  }, [formData, shareSubtype]);

  const handleShareNative = async () => {
    const textMsg = `🏋️‍♂️🥗 Ecco il mio piano Chelona Fitness & Dieta!\n\nImportalo aprendo Fitness & Dieta su Chelona, clicca "Ricevi da Partner" e usa la fotocamera o incolla questo codice:\n\n${sharePayload}`;
    try {
      (window as any).__chelona_bypass_lock = true;
      await Share.share({
        title: 'Condividi Piano Fitness & Dieta',
        text: textMsg,
        dialogTitle: 'Condividi con il partner'
      });
    } catch {
      try {
        await navigator.clipboard.writeText(sharePayload);
        setHasCopiedShareCode(true);
        setTimeout(() => setHasCopiedShareCode(false), 2500);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(sharePayload);
      setHasCopiedShareCode(true);
      setTimeout(() => setHasCopiedShareCode(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const processIncomingData = (raw: string) => {
    try {
      let text = raw.trim();
      if (text.startsWith('LZW:')) {
        text = lzw.decompress(text);
      }
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        const lzwMatch = text.match(/LZW:[A-Za-z0-9+/=]+/);
        if (lzwMatch) {
          text = lzw.decompress(lzwMatch[0]);
          parsed = JSON.parse(text);
        }
      }

      if (!parsed) throw new Error("Dati non validi");

      const payloadData = parsed.d || parsed.data || parsed;
      const subtype = parsed.subtype || (payloadData.mealPlanWeekly && payloadData.workoutPlan ? 'all' : payloadData.mealPlanWeekly ? 'diet' : 'workout');

      // Reidratazione automatica da librerie locali (gifUrl, descrizioni, ricette)
      if (payloadData.workoutPlan) {
        payloadData.workoutPlan = payloadData.workoutPlan.map((day: any) => ({
          ...day,
          exercises: (day.exercises || []).map((e: any) => {
            const match = EXERCISE_LIBRARY.find(ex => ex.name.toLowerCase() === e.name.toLowerCase());
            return {
              ...e,
              gifUrl: match?.gifUrl || e.gifUrl
            };
          })
        }));
      }

      if (payloadData.mealPlanWeekly) {
        payloadData.mealPlanWeekly = payloadData.mealPlanWeekly.map((day: any) => {
          const meals = (day.meals || []).map((m: any) => {
            const match = MEAL_LIBRARY.find(ml => ml.name.toLowerCase() === m.name.toLowerCase());
            return {
              ...m,
              description: m.description || match?.description || '',
              recipeUrl: m.recipeUrl || match?.recipeUrl,
              isSimple: m.isSimple !== undefined ? m.isSimple : match?.isSimple
            };
          });
          return {
            meals,
            totalCalories: meals.reduce((acc: number, m: any) => acc + (m.calories || 0), 0),
            totalProtein: meals.reduce((acc: number, m: any) => acc + (m.protein || 0), 0),
            totalCarbs: meals.reduce((acc: number, m: any) => acc + (m.carbs || 0), 0),
            totalFat: meals.reduce((acc: number, m: any) => acc + (m.fat || 0), 0)
          };
        });
      }

      setParsedIncomingData({
        ...payloadData,
        _subtype: subtype
      });

      if (payloadData.targetCalories) {
        setCustomScaleCalories(formData.targetCalories || payloadData.targetCalories);
      }

      setIsScanningPartnerQr(false);
      setManualCodeInput('');
    } catch (err) {
      alert("Codice o QR non valido per Fitness & Dieta. Assicurati che provenga da Chelona.");
    }
  };

  const handleApplyImport = (mode: 'scale_diet' | 'exact_diet' | 'partner_diet_only' | 'replace_workout' | 'partner_workout_only' | 'all') => {
    if (!parsedIncomingData) return;
    let updated: FitnessModule = { ...formData };

    if (mode === 'scale_diet') {
      const targetCals = customScaleCalories || formData.targetCalories || 1800;
      const scaledMeals = adaptMealPlanToCalories(parsedIncomingData.mealPlanWeekly, targetCals);
      
      updated = {
        ...updated,
        mealPlanWeekly: scaledMeals,
        targetCalories: targetCals,
        partnerMealPlanWeekly: parsedIncomingData.mealPlanWeekly,
        partnerTargetCalories: parsedIncomingData.targetCalories,
        partnerDietProfile: parsedIncomingData.dietProfile,
        partnerName: partnerDisplayName || 'Partner'
      };
      setDietViewMode('couple');
      setCurrentView('diet-plan');
      setPartnerToastMsg(`Dieta sincronizzata! Stessi piatti, porzioni calibrate a ${targetCals} kcal.`);
    } else if (mode === 'exact_diet') {
      updated = {
        ...updated,
        mealPlanWeekly: parsedIncomingData.mealPlanWeekly,
        targetCalories: parsedIncomingData.targetCalories,
        dietProfile: parsedIncomingData.dietProfile,
        partnerMealPlanWeekly: parsedIncomingData.mealPlanWeekly,
        partnerTargetCalories: parsedIncomingData.targetCalories,
        partnerName: partnerDisplayName || 'Partner'
      };
      setDietViewMode('me');
      setCurrentView('diet-plan');
      setPartnerToastMsg(`Dieta del partner importata con porzioni originali 1:1!`);
    } else if (mode === 'partner_diet_only') {
      updated = {
        ...updated,
        partnerMealPlanWeekly: parsedIncomingData.mealPlanWeekly,
        partnerTargetCalories: parsedIncomingData.targetCalories,
        partnerDietProfile: parsedIncomingData.dietProfile,
        partnerName: partnerDisplayName || 'Partner'
      };
      setDietViewMode('couple');
      setCurrentView('diet-plan');
      setPartnerToastMsg(`Dieta salvata per ${partnerDisplayName || 'Partner'}! Puoi visualizzare le porzioni di coppia.`);
    } else if (mode === 'replace_workout') {
      updated = {
        ...updated,
        workoutPlan: parsedIncomingData.workoutPlan,
        fitnessProfile: parsedIncomingData.fitnessProfile,
        partnerWorkoutPlan: parsedIncomingData.workoutPlan,
        partnerFitnessProfile: parsedIncomingData.fitnessProfile,
        partnerName: partnerDisplayName || 'Partner'
      };
      setWorkoutViewMode('me');
      setCurrentView('fitness-plan');
      setPartnerToastMsg(`Scheda allenamento del partner importata con successo!`);
    } else if (mode === 'partner_workout_only') {
      updated = {
        ...updated,
        partnerWorkoutPlan: parsedIncomingData.workoutPlan,
        partnerFitnessProfile: parsedIncomingData.fitnessProfile,
        partnerName: partnerDisplayName || 'Partner'
      };
      setWorkoutViewMode('partner');
      setCurrentView('fitness-plan');
      setPartnerToastMsg(`Scheda di ${partnerDisplayName || 'Partner'} salvata con successo!`);
    } else if (mode === 'all') {
      const targetCals = customScaleCalories || formData.targetCalories || parsedIncomingData.targetCalories || 1800;
      const scaledMeals = parsedIncomingData.mealPlanWeekly ? adaptMealPlanToCalories(parsedIncomingData.mealPlanWeekly, targetCals) : undefined;

      updated = {
        ...updated,
        workoutPlan: parsedIncomingData.workoutPlan || updated.workoutPlan,
        fitnessProfile: parsedIncomingData.fitnessProfile || updated.fitnessProfile,
        mealPlanWeekly: scaledMeals || updated.mealPlanWeekly,
        targetCalories: targetCals,
        partnerMealPlanWeekly: parsedIncomingData.mealPlanWeekly,
        partnerTargetCalories: parsedIncomingData.targetCalories,
        partnerWorkoutPlan: parsedIncomingData.workoutPlan,
        partnerFitnessProfile: parsedIncomingData.fitnessProfile,
        partnerName: partnerDisplayName || 'Partner'
      };
      setDietViewMode('couple');
      setPartnerToastMsg(`Scheda Allenamento e Dieta sincronizzate con successo!`);
    }

    setFormData(updated);
    onSave(updated);
    setParsedIncomingData(null);
    setShowReceiveModal(false);
  };

  const handleSwapMeal = (alternativeTemplate: MealTemplate) => {
    if (!swappingMealInfo || !activeMealPlanWeekly) return;
    const { dayIndex, mealIndex, meal: currentMeal } = swappingMealInfo;

    const targetCalories = currentMeal.calories || alternativeTemplate.baseCalories;
    const factor = targetCalories / alternativeTemplate.baseCalories;

    const newMeal: Meal = {
      name: alternativeTemplate.name,
      description: alternativeTemplate.description,
      calories: Math.round(alternativeTemplate.baseCalories * factor),
      protein: Math.round(alternativeTemplate.baseProtein * factor),
      carbs: Math.round(alternativeTemplate.baseCarbs * factor),
      fat: Math.round(alternativeTemplate.baseFat * factor),
      isSimple: alternativeTemplate.isSimple,
      recipeUrl: alternativeTemplate.recipeUrl
    };

    const updatedPlanWeekly = [...activeMealPlanWeekly];
    const targetDay = { ...updatedPlanWeekly[dayIndex] };
    const updatedMeals = [...targetDay.meals];
    updatedMeals[mealIndex] = newMeal;

    targetDay.meals = updatedMeals;
    targetDay.totalCalories = updatedMeals.reduce((acc, m) => acc + m.calories, 0);
    targetDay.totalProtein = updatedMeals.reduce((acc, m) => acc + m.protein, 0);
    targetDay.totalCarbs = updatedMeals.reduce((acc, m) => acc + m.carbs, 0);
    targetDay.totalFat = updatedMeals.reduce((acc, m) => acc + m.fat, 0);

    updatedPlanWeekly[dayIndex] = targetDay;

    const updatedModule: FitnessModule = {
      ...formData,
      mealPlanWeekly: updatedPlanWeekly
    };

    setFormData(updatedModule);
    onSave(updatedModule);
    setSwappingMealInfo(null);
  };

  const handleUpdateMealTime = (dayIdx: number, mealIdx: number, newTime: string) => {
    if (!activeMealPlanWeekly) return;
    const updatedPlanWeekly = [...activeMealPlanWeekly];
    const targetDay = { ...updatedPlanWeekly[dayIdx] };
    const updatedMeals = [...targetDay.meals];
    
    updatedMeals[mealIdx] = {
      ...updatedMeals[mealIdx],
      time: newTime
    };

    targetDay.meals = updatedMeals;
    updatedPlanWeekly[dayIdx] = targetDay;

    const updatedModule: FitnessModule = {
      ...formData,
      mealPlanWeekly: updatedPlanWeekly
    };

    setFormData(updatedModule);
    onSave(updatedModule);
    notificationService.syncAllModuleNotifications([updatedModule]);
  };

  const handleToggleMealNotification = async (dayIdx: number, mealIdx: number) => {
    if (!activeMealPlanWeekly) return;
    const currentMeal = activeMealPlanWeekly[dayIdx].meals[mealIdx];
    const nextState = !currentMeal.notificationsEnabled;

    if (nextState) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        alert("Attiva le notifiche nelle impostazioni del tuo dispositivo per ricevere i promemoria dei pasti.");
        return;
      }
    }

    const updatedPlanWeekly = [...activeMealPlanWeekly];
    const targetDay = { ...updatedPlanWeekly[dayIdx] };
    const updatedMeals = [...targetDay.meals];
    
    updatedMeals[mealIdx] = {
      ...updatedMeals[mealIdx],
      notificationsEnabled: nextState
    };

    targetDay.meals = updatedMeals;
    updatedPlanWeekly[dayIdx] = targetDay;

    const updatedModule: FitnessModule = {
      ...formData,
      mealPlanWeekly: updatedPlanWeekly
    };

    setFormData(updatedModule);
    onSave(updatedModule);
    await notificationService.syncAllModuleNotifications([updatedModule]);
  };

  const handleToggleAllMealNotifications = async (enable: boolean) => {
    if (!activeMealPlanWeekly) return;
    if (enable) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        alert("Attiva le notifiche nelle impostazioni del tuo dispositivo per ricevere i promemoria dei pasti.");
        return;
      }
    }

    const updatedPlanWeekly = activeMealPlanWeekly.map(day => ({
      ...day,
      meals: day.meals.map((m, idx) => ({
        ...m,
        time: m.time || (idx === 0 ? '08:00' : idx === 1 ? '10:30' : idx === 2 ? '13:00' : idx === 3 ? '16:30' : '20:00'),
        notificationsEnabled: enable
      }))
    }));

    const updatedModule: FitnessModule = {
      ...formData,
      mealPlanWeekly: updatedPlanWeekly
    };

    setFormData(updatedModule);
    onSave(updatedModule);
    await notificationService.syncAllModuleNotifications([updatedModule]);
  };


  const [isSearchingRecipe, setIsSearchingRecipe] = useState<{[key: string]: boolean}>({});

  const loadAndFindRecipe = async (mealName: string, fallbackDesc: string, key: string, recipeUrl?: string) => {
    setIsSearchingRecipe(prev => ({...prev, [key]: true}));
    try {
      const result = await findRecipeForMeal(mealName, fallbackDesc, recipeUrl);
      if (result && !result.notFound) {
        window.dispatchEvent(new CustomEvent('open-recipes', { detail: { recipe: result } }));
      } else {
        window.dispatchEvent(new CustomEvent('open-recipes', { detail: { search: mealName } }));
      }
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('open-recipes', { detail: { search: mealName } }));
    } finally {
      setIsSearchingRecipe(prev => ({...prev, [key]: false}));
    }
  };

  const [fitProfile, setFitProfile] = useState<FitnessProfile>(module.fitnessProfile || {
    gender: 'male', age: 25, height: 175, weight: 70, level: 'beginner', goal: 'mass', daysPerWeek: 3, equipment: 'gym'
  });

  const [dietProfile, setDietProfile] = useState<DietProfile>(module.dietProfile || {
    gender: 'male', age: 25, height: 175, weight: 70, activityLevel: 'active', goal: 'maintain', restrictions: [], mealsPerDay: 4
  });

  const handleBack = () => {
    if (currentView === 'fitness-plan' || currentView === 'diet-plan') {
      setCurrentView('catalog');
    } else if (currentView === 'fitness-wizard') {
      if (fitWizardStep > 1) setFitWizardStep(fitWizardStep - 1);
      else setCurrentView('catalog');
    } else if (currentView === 'diet-wizard') {
      if (dietWizardStep > 1) setDietWizardStep(dietWizardStep - 1);
      else setCurrentView('catalog');
    } else {
      onClose();
    }
  };

  const generateFitnessPlan = () => {
    const plan = generateWorkoutPlan(fitProfile);
    const updated = {
      ...formData,
      fitnessProfile: fitProfile,
      workoutPlan: plan
    };
    setFormData(updated);
    setCurrentView('fitness-plan');
    onSave(updated);
  };

  const toggleWorkoutDay = (index: number) => {
    if (!formData.workoutPlan) return;
    const newPlan = [...formData.workoutPlan];
    newPlan[index].isCompleted = !newPlan[index].isCompleted;
    const updated = { ...formData, workoutPlan: newPlan };
    setFormData(updated);
    onSave(updated);
  };

  const generateDietPlan = () => {
    const bmr = calculateBMR(dietProfile);
    const tdee = calculateTDEE(bmr, dietProfile.activityLevel);
    let targetCalories = tdee;
    if (dietProfile.goal === 'cut') targetCalories -= 400;
    else if (dietProfile.goal === 'bulk') targetCalories += 300;
    
    const mealPlanWeekly = generateMealPlanWeekly(dietProfile, targetCalories);
    
    const updated = {
      ...formData,
      dietProfile,
      mealPlanWeekly,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories)
    };
    setFormData(updated);
    setCurrentView('diet-plan');
    onSave(updated);
  };

  // --- RENDERERS ---

  const activeMealPlanWeekly = useMemo(() => {
    if (formData.mealPlanWeekly && formData.mealPlanWeekly.length > 0) return formData.mealPlanWeekly;
    if (formData.mealPlan) return Array(7).fill(formData.mealPlan);
    return null;
  }, [formData.mealPlanWeekly, formData.mealPlan]);

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 safe-area-header gap-2">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button onClick={handleBack} className="p-2.5 sm:p-3 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-2xl transition-all shadow-sm shrink-0">
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-main)]" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)] truncate">{formData.title}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] truncate">
              {currentView === 'catalog' ? 'Seleziona un percorso' : 
               currentView.includes('wizard') ? 'Configurazione' : 'Piano Attivo'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Condividi & Ricevi Partner */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {(formData.mealPlanWeekly || formData.workoutPlan) && (
            <button
              onClick={() => {
                if (currentView === 'diet-plan') setShareSubtype('diet');
                else if (currentView === 'fitness-plan') setShareSubtype('workout');
                else setShareSubtype('all');
                setShowShareModal(true);
              }}
              className="p-2 sm:px-3 sm:py-2 bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/50 hover:bg-amber-500/10 text-[var(--text-main)] hover:text-amber-500 rounded-xl sm:rounded-2xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
              title="Passa la scheda o la dieta al partner"
            >
              <Share2 className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline">Invia al Partner</span>
            </button>
          )}

          <button
            onClick={() => setShowReceiveModal(true)}
            className="p-2 sm:px-3.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl sm:rounded-2xl transition-all shadow-md shadow-emerald-500/20 hover:opacity-90 active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Ricevi dal partner (QR o Codice)"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">Ricevi da Partner</span>
          </button>
        </div>
      </header>

      {/* Floating Partner Notification Toast */}
      <AnimatePresence>
        {partnerToastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500 text-white px-6 py-3 text-center text-xs font-extrabold shadow-xl flex items-center justify-center gap-2 z-30 shrink-0"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{partnerToastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* CATALOG VIEW */}
        {currentView === 'catalog' && (
          <div className="px-6 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-black text-[var(--text-main)]">Scegli il tuo percorso</h3>
                <p className="text-xs font-bold text-[var(--text-muted)]">Seleziona Fitness o Dieta per generare il tuo piano personalizzato.</p>
              </div>

              {/* Partner Quick Sync Banner */}
              <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-500/20 rounded-[2.5rem] p-6 relative overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                      <Users className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">Coppia & Partner</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-[var(--text-main)]">Passa Scheda o Dieta al Partner</h4>
                      <p className="text-xs font-medium text-[var(--text-muted)] mt-1 leading-relaxed">
                        Condividi la tua dieta per <b>cucinare gli stessi piatti insieme</b> (calcolando le porzioni esatte per ciascuno) o scambia la scheda di allenamento.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {(formData.mealPlanWeekly || formData.workoutPlan) && (
                      <button
                        onClick={() => { setShareSubtype('all'); setShowShareModal(true); }}
                        className="px-4 py-2.5 bg-[var(--card-bg)] border border-indigo-500/30 hover:border-indigo-500 text-[var(--text-main)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:bg-indigo-500/10"
                      >
                        <Share2 className="w-4 h-4 text-indigo-500" />
                        <span>Invia</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowReceiveModal(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/25 hover:opacity-95 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Ricevi da Partner</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Fitness Card */}
                <button
                  onClick={() => formData.workoutPlan ? setCurrentView('fitness-plan') : setCurrentView('fitness-wizard')}
                  className="p-8 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] text-left hover:border-emerald-500/50 hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100" />
                  
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 mb-6">
                    <Dumbbell className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-black text-[var(--text-main)] mb-2">Fitness</h4>
                  <p className="text-sm font-semibold text-[var(--text-muted)] mb-6">Personal Trainer virtuale. Genera schede d'allenamento basate sui tuoi obiettivi.</p>
                  
                  {formData.workoutPlan ? (
                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl w-fit">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-bold">Piano Attivo</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--text-main)] opacity-50 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold uppercase tracking-wider">Inizia ora</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </button>

                {/* Diet Card */}
                <button
                  onClick={() => activeMealPlanWeekly ? setCurrentView('diet-plan') : setCurrentView('diet-wizard')}
                  className="p-8 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] text-left hover:border-amber-500/50 hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100" />
                  
                  <div className="w-16 h-16 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mb-6">
                    <Utensils className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-black text-[var(--text-main)] mb-2">Dieta</h4>
                  <p className="text-sm font-semibold text-[var(--text-muted)] mb-6">Nutrizionista virtuale. Calcola BMR, TDEE e genera il tuo piano alimentare.</p>
                  
                  {activeMealPlanWeekly ? (
                    <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-xl w-fit">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-bold">Piano Attivo</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--text-main)] opacity-50 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold uppercase tracking-wider">Inizia ora</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </button>

              </div>
            </div>
          </div>
        )}

        {/* FITNESS WIZARD */}
        {currentView === 'fitness-wizard' && (
          <div className="px-6 py-8">
            <div className="max-w-xl mx-auto space-y-8">
              
              <div className="flex items-center gap-2 mb-8">
                {[1,2,3,4,5,6].map(s => (
                  <div key={s} className={`h-2 flex-1 rounded-full ${s <= fitWizardStep ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                ))}
              </div>

              {fitWizardStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Qual è il tuo sesso?</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setFitProfile({...fitProfile, gender: 'male'}); setFitWizardStep(2); }} className={`p-6 rounded-3xl border-2 transition-all ${fitProfile.gender === 'male' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                      <div className="text-4xl mb-4 text-center">👨</div>
                      <p className="font-bold text-center text-[var(--text-main)]">Uomo</p>
                    </button>
                    <button onClick={() => { setFitProfile({...fitProfile, gender: 'female'}); setFitWizardStep(2); }} className={`p-6 rounded-3xl border-2 transition-all ${fitProfile.gender === 'female' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                      <div className="text-4xl mb-4 text-center">👩</div>
                      <p className="font-bold text-center text-[var(--text-main)]">Donna</p>
                    </button>
                  </div>
                </motion.div>
              )}

              {fitWizardStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">I tuoi dati fisici</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Età (anni)</label>
                      <input type="number" value={fitProfile.age || ''} onChange={e => setFitProfile({...fitProfile, age: parseInt(e.target.value)||0})} className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text-main)] font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Altezza (cm)</label>
                      <input type="number" value={fitProfile.height || ''} onChange={e => setFitProfile({...fitProfile, height: parseInt(e.target.value)||0})} className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text-main)] font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Peso (kg)</label>
                      <input type="number" value={fitProfile.weight || ''} onChange={e => setFitProfile({...fitProfile, weight: parseInt(e.target.value)||0})} className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text-main)] font-bold outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <button onClick={() => setFitWizardStep(3)} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl">Avanti</button>
                </motion.div>
              )}

              {fitWizardStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Livello di esperienza</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'beginner', label: 'Principiante', desc: 'Meno di 6 mesi di allenamento' },
                      { id: 'intermediate', label: 'Intermedio', desc: '6-24 mesi di allenamento costante' },
                      { id: 'advanced', label: 'Avanzato', desc: 'Oltre 2 anni di allenamento costante' }
                    ].map(opt => (
                      <button key={opt.id} onClick={() => { setFitProfile({...fitProfile, level: opt.id as any}); setFitWizardStep(4); }} className={`w-full p-6 text-left rounded-3xl border-2 transition-all ${fitProfile.level === opt.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                        <p className="font-bold text-lg text-[var(--text-main)]">{opt.label}</p>
                        <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {fitWizardStep === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-[var(--text-main)]">I tuoi obiettivi</h3>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Puoi selezionare più di un obiettivo per accorpare i tuoi traguardi!</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'mass', label: 'Massa Muscolare', desc: 'Aumento della massa magra e del volume muscolare', icon: '💪' },
                      { id: 'cut', label: 'Dimagrimento & Definizione', desc: 'Bruciare grasso superfluo e scolpire i muscoli', icon: '🔥' },
                      { id: 'strength', label: 'Forza Massimale', desc: 'Incremento della forza pura e potenza', icon: '🏋️‍♂️' },
                      { id: 'tone', label: 'Tonificazione Muscolare', desc: 'Migliorare tono, elasticità e definizione', icon: '✨' }
                    ].map(opt => {
                      const currentGoals = fitProfile.goals || [fitProfile.goal];
                      const isChecked = currentGoals.includes(opt.id);

                      return (
                        <button 
                          key={opt.id} 
                          onClick={() => {
                            let updated: string[];
                            if (isChecked) {
                              updated = currentGoals.filter(g => g !== opt.id);
                              if (updated.length === 0) updated = [opt.id];
                            } else {
                              updated = [...currentGoals, opt.id];
                            }
                            
                            const labelsMap: any = { mass: 'Massa', cut: 'Dimagrimento', strength: 'Forza', tone: 'Tonificazione' };
                            const summaryLabel = updated.length >= 2 && updated.includes('mass') && updated.includes('cut') 
                              ? 'Ricomposizione Corporea (Massa + Dimagrimento)' 
                              : updated.map(g => labelsMap[g] || g).join(' + ');

                            setFitProfile({ ...fitProfile, goals: updated, goal: summaryLabel });
                          }} 
                          className={`w-full p-5 flex items-center justify-between gap-4 text-left rounded-3xl border-2 transition-all ${
                            (fitProfile.goals || [fitProfile.goal]).includes(opt.id) 
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' 
                              : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-emerald-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{opt.icon}</span>
                            <div>
                              <p className="font-bold text-base text-[var(--text-main)]">{opt.label}</p>
                              <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors ${
                            (fitProfile.goals || [fitProfile.goal]).includes(opt.id)
                              ? 'bg-emerald-500 border-emerald-500 text-white font-black text-xs'
                              : 'border-[var(--border)] text-transparent'
                          }`}>
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {fitProfile.goal && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Obiettivo Combinato</p>
                      <p className="font-extrabold text-sm text-[var(--text-main)]">{fitProfile.goal}</p>
                    </div>
                  )}

                  <button 
                    onClick={() => setFitWizardStep(5)} 
                    className="w-full py-4 bg-emerald-500 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
                  >
                    Conferma Obiettivi (Avanti) ➔
                  </button>
                </motion.div>
              )}

              {fitWizardStep === 5 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Giorni a settimana</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {[2,3,4,5,6].map(d => (
                      <button key={d} onClick={() => { setFitProfile({...fitProfile, daysPerWeek: d}); setFitWizardStep(6); }} className={`p-4 text-center rounded-2xl border-2 font-black text-xl transition-all ${fitProfile.daysPerWeek === d ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-main)]'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {fitWizardStep === 6 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Attrezzatura disponibile</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'gym', label: '🏋️ Palestra Completa', desc: 'Bilancieri, manubri, macchinari e cavi' },
                      { id: 'home', label: '🏠 Casa con attrezzi base', desc: 'Manubri, panca e sbarra' },
                      { id: 'bands', label: '🎗️ Corpo Libero + Elastici', desc: 'Corpo libero integrato con bande elastiche e mini-band' },
                      { id: 'bodyweight', label: '🤸 Solo Corpo Libero', desc: 'Nessun attrezzo, allenamento a corpo libero puro' }
                    ].map(opt => (
                      <button key={opt.id} onClick={() => setFitProfile({...fitProfile, equipment: opt.id as any})} className={`w-full p-6 text-left rounded-3xl border-2 transition-all ${fitProfile.equipment === opt.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                        <p className="font-bold text-lg text-[var(--text-main)]">{opt.label}</p>
                        <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={generateFitnessPlan} className="w-full py-5 bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors mt-8">
                    Genera Piano Allenamento
                  </button>
                </motion.div>
              )}

            </div>
          </div>
        )}

        {/* DIET WIZARD */}
        {currentView === 'diet-wizard' && (
          <div className="px-6 py-8">
            <div className="max-w-xl mx-auto space-y-8">
              
              <div className="flex items-center gap-2 mb-8">
                {[1,2,3,4,5,6].map(s => (
                  <div key={s} className={`h-2 flex-1 rounded-full ${s <= dietWizardStep ? 'bg-amber-500' : 'bg-[var(--border)]'}`} />
                ))}
              </div>

              {dietWizardStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Qual è il tuo sesso?</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setDietProfile({...dietProfile, gender: 'male'}); setDietWizardStep(2); }} className={`p-6 rounded-3xl border-2 transition-all ${dietProfile.gender === 'male' ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                      <div className="text-4xl mb-4 text-center">👨</div>
                      <p className="font-bold text-center text-[var(--text-main)]">Uomo</p>
                    </button>
                    <button onClick={() => { setDietProfile({...dietProfile, gender: 'female'}); setDietWizardStep(2); }} className={`p-6 rounded-3xl border-2 transition-all ${dietProfile.gender === 'female' ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                      <div className="text-4xl mb-4 text-center">👩</div>
                      <p className="font-bold text-center text-[var(--text-main)]">Donna</p>
                    </button>
                  </div>
                </motion.div>
              )}

              {dietWizardStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">I tuoi dati fisici</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Età (anni)</label>
                      <input type="number" value={dietProfile.age || ''} onChange={e => setDietProfile({...dietProfile, age: parseInt(e.target.value)||0})} className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text-main)] font-bold outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Altezza (cm)</label>
                      <input type="number" value={dietProfile.height || ''} onChange={e => setDietProfile({...dietProfile, height: parseInt(e.target.value)||0})} className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text-main)] font-bold outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Peso (kg)</label>
                      <input type="number" value={dietProfile.weight || ''} onChange={e => setDietProfile({...dietProfile, weight: parseInt(e.target.value)||0})} className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text-main)] font-bold outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <button onClick={() => setDietWizardStep(3)} className="w-full py-4 bg-amber-500 text-white font-bold rounded-2xl">Avanti</button>
                </motion.div>
              )}

              {dietWizardStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Livello di attività</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'sedentary', label: 'Sedentario', desc: 'Poco o nessun esercizio fisico' },
                      { id: 'light', label: 'Leggermente Attivo', desc: 'Esercizio leggero 1-3 giorni a settimana' },
                      { id: 'active', label: 'Attivo', desc: 'Esercizio moderato 3-5 giorni a settimana' },
                      { id: 'very_active', label: 'Molto Attivo', desc: 'Esercizio intenso 6-7 giorni a settimana' }
                    ].map(opt => (
                      <button key={opt.id} onClick={() => { setDietProfile({...dietProfile, activityLevel: opt.id as any}); setDietWizardStep(4); }} className={`w-full p-6 text-left rounded-3xl border-2 transition-all ${dietProfile.activityLevel === opt.id ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                        <p className="font-bold text-lg text-[var(--text-main)]">{opt.label}</p>
                        <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {dietWizardStep === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-[var(--text-main)]">Obiettivo Alimentare</h3>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Puoi selezionare uno o più traguardi per il tuo piano nutrizionale!</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'recomp', label: '⚡ Ricomposizione Corporea', desc: 'Perdere grasso e tonificare/costruire muscolo contemporaneamente' },
                      { id: 'cut', label: '🔥 Perdita di Peso / Definizione', desc: 'Deficit calorico per ridurre la massa grassa' },
                      { id: 'maintain', label: '⚖️ Mantenimento & Tono', desc: 'Mantenere il peso attuale con apporto proteico bilanciato' },
                      { id: 'bulk', label: '💪 Aumento Massa (Clean Bulk)', desc: 'Lieve surplus calorico per favorire l\'ipertrofia muscolare' }
                    ].map(opt => {
                      const currentGoals = dietProfile.goals || [dietProfile.goal];
                      const isChecked = currentGoals.includes(opt.id);

                      return (
                        <button 
                          key={opt.id} 
                          onClick={() => {
                            let updated: string[];
                            if (isChecked) {
                              updated = currentGoals.filter(g => g !== opt.id);
                              if (updated.length === 0) updated = [opt.id];
                            } else {
                              updated = [...currentGoals, opt.id];
                            }

                            const labelsMap: any = { recomp: 'Ricomposizione', cut: 'Dimagrimento', maintain: 'Mantenimento', bulk: 'Massa' };
                            const summaryLabel = updated.includes('recomp') || (updated.includes('cut') && updated.includes('bulk'))
                              ? 'Ricomposizione Corporea (Massa + Dimagrimento)'
                              : updated.map(g => labelsMap[g] || g).join(' + ');

                            setDietProfile({ ...dietProfile, goals: updated, goal: summaryLabel });
                          }} 
                          className={`w-full p-5 text-left rounded-3xl border-2 transition-all flex items-center justify-between ${
                            (dietProfile.goals || [dietProfile.goal]).includes(opt.id) 
                              ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10' 
                              : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-amber-500/50'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-base text-[var(--text-main)]">{opt.label}</p>
                            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">{opt.desc}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors shrink-0 ml-3 ${
                            (dietProfile.goals || [dietProfile.goal]).includes(opt.id)
                              ? 'bg-amber-500 border-amber-500 text-white font-black text-xs'
                              : 'border-[var(--border)] text-transparent'
                          }`}>
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {dietProfile.goal && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Obiettivo Nutrizionale Combinato</p>
                      <p className="font-extrabold text-sm text-[var(--text-main)]">{dietProfile.goal}</p>
                    </div>
                  )}

                  <button 
                    onClick={() => setDietWizardStep(5)} 
                    className="w-full py-4 bg-amber-500 text-white font-black text-base rounded-2xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors"
                  >
                    Conferma Obiettivi (Avanti) ➔
                  </button>
                </motion.div>
              )}

              {dietWizardStep === 5 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Restrizioni Alimentari</h3>
                  <div className="space-y-3">
                    {['vegetarian', 'vegan', 'gluten-free', 'lactose-free'].map(res => {
                      const labels: any = { 'vegetarian': 'Vegetariano', 'vegan': 'Vegano', 'gluten-free': 'Senza Glutine', 'lactose-free': 'Senza Lattosio' };
                      const isSelected = dietProfile.restrictions.includes(res);
                      return (
                        <button key={res} onClick={() => {
                          const newRes = isSelected ? dietProfile.restrictions.filter(r => r !== res) : [...dietProfile.restrictions, res];
                          setDietProfile({...dietProfile, restrictions: newRes});
                        }} className={`w-full p-5 flex items-center justify-between text-left rounded-3xl border-2 transition-all ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                          <p className="font-bold text-lg text-[var(--text-main)]">{labels[res]}</p>
                          {isSelected && <Check className="w-5 h-5 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setDietWizardStep(6)} className="w-full py-4 bg-amber-500 text-white font-bold rounded-2xl mt-4">Avanti</button>
                </motion.div>
              )}

              {dietWizardStep === 6 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Pasti al giorno</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[3, 4, 5].map(m => (
                      <button key={m} onClick={() => setDietProfile({...dietProfile, mealsPerDay: m})} className={`p-6 text-center rounded-3xl border-2 transition-all ${dietProfile.mealsPerDay === m ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                        <p className="font-black text-2xl text-[var(--text-main)]">{m}</p>
                        <p className="text-xs font-bold text-[var(--text-muted)] mt-1">Pasti</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={generateDietPlan} className="w-full py-5 bg-amber-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-colors mt-8">
                    Genera Piano Alimentare
                  </button>
                </motion.div>
              )}

            </div>
          </div>
        )}

        {/* FITNESS PLAN VIEW */}
        {currentView === 'fitness-plan' && (formData.workoutPlan || formData.partnerWorkoutPlan) && (
          <div className="px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">

              {/* Partner Workout Selector */}
              {formData.partnerWorkoutPlan && (
                <div className="flex bg-[var(--surface-variant)] p-1.5 rounded-2xl gap-1.5 border border-[var(--border)] shadow-inner">
                  <button
                    onClick={() => setWorkoutViewMode('me')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      workoutViewMode === 'me'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>👤 La Mia Scheda</span>
                  </button>
                  <button
                    onClick={() => setWorkoutViewMode('partner')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      workoutViewMode === 'partner'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>👥 Scheda {formData.partnerName || 'Partner'}</span>
                  </button>
                </div>
              )}
              
              {/* Profile Summary */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 flex flex-wrap items-center gap-4 justify-between shadow-sm">
                <div>
                  <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-emerald-500" />
                    {workoutViewMode === 'partner' ? `Scheda di ${formData.partnerName || 'Partner'}` : 'Il tuo Piano Allenamento'}
                  </h3>
                  <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">
                    {workoutViewMode === 'partner'
                      ? `${formData.partnerFitnessProfile?.daysPerWeek || (formData.partnerWorkoutPlan?.length || 3)} giorni/settimana • Obiettivo: ${formData.partnerFitnessProfile?.goal || 'Fitness'}`
                      : `${formData.fitnessProfile?.daysPerWeek} giorni/settimana • Obiettivo: ${formData.fitnessProfile?.goal}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setShareSubtype('workout'); setShowShareModal(true); }}
                    className="p-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
                    title="Passa questa scheda al partner"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Invia Scheda</span>
                  </button>
                  <button onClick={() => setCurrentView('fitness-wizard')} className="p-3 bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Workout Days */}
              <div className="space-y-4">
                {(((workoutViewMode === 'partner' && formData.partnerWorkoutPlan) ? formData.partnerWorkoutPlan : formData.workoutPlan) || []).map((day, idx) => (
                  <div key={idx} className={`bg-[var(--card-bg)] border rounded-[2rem] overflow-hidden transition-all ${day.isCompleted ? 'border-emerald-500/50 opacity-80' : 'border-[var(--border)]'}`}>
                    <div 
                      className="p-6 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedDayIndex(expandedDayIndex === idx ? null : idx)}
                    >
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleWorkoutDay(idx); }}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${day.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)] text-transparent'}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{day.dayLabel}</p>
                          <h4 className={`text-lg font-bold mt-1 ${day.isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)]'}`}>{day.focus}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[var(--text-muted)]">
                        <span className="text-xs font-bold">{day.exercises.length} es.</span>
                        {expandedDayIndex === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedDayIndex === idx && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-6 pb-6 pt-2 border-t border-[var(--border)]">
                            <div className="space-y-4">
                              {day.exercises.map((ex, eIdx) => (
                                <div key={eIdx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[var(--bg)] p-4 rounded-2xl gap-4 border border-transparent hover:border-[var(--border)] transition-colors">
                                  <div className="flex items-center gap-4 flex-1 w-full">
                                    {ex.gifUrl && (
                                      <div 
                                        className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white rounded-xl overflow-hidden shadow-sm flex items-center justify-center p-1 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                                        onClick={(e) => { e.stopPropagation(); setEnlargedGifUrl(ex.gifUrl || null); }}
                                      >
                                        <img src={ex.gifUrl} alt={ex.name} className="max-w-full max-h-full object-contain pointer-events-none" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <p className="font-bold text-sm text-[var(--text-main)]">{ex.name}</p>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">{ex.muscleGroup}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end gap-6 border-t border-[var(--border)] sm:border-0 pt-4 sm:pt-0 mt-2 sm:mt-0 shrink-0">
                                    <div className="text-left sm:text-right">
                                      <p className="font-black text-emerald-500">{ex.sets} × {ex.reps}</p>
                                      <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1">Rec: {ex.rest}</p>
                                    </div>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' tutorial esercizio esecuzione')}`, '_blank');
                                      }}
                                      className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-colors shrink-0"
                                      title="Vedi Esecuzione su YouTube"
                                    >
                                      <Play className="w-5 h-5 fill-current" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {enlargedGifUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEnlargedGifUrl(null)}
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setEnlargedGifUrl(null); }}
                className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-[210]"
              >
                <X className="w-6 h-6" />
              </button>
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] p-4 max-w-lg w-full max-h-[80vh] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden"
              >
                <img src={enlargedGifUrl} alt="Esercizio ingrandito" className="w-full h-auto max-h-[70vh] object-contain rounded-xl" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DIET PLAN VIEW */}
        {currentView === 'diet-plan' && (activeMealPlanWeekly || formData.partnerMealPlanWeekly) && (
          <div className="px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">

              {/* Partner Mode Selector if Partner Diet is available */}
              {formData.partnerMealPlanWeekly && (
                <div className="flex bg-[var(--surface-variant)] p-1.5 rounded-2xl gap-1.5 border border-[var(--border)] shadow-inner">
                  <button
                    onClick={() => setDietViewMode('me')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      dietViewMode === 'me'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>👤 Le mie porzioni</span>
                  </button>

                  <button
                    onClick={() => setDietViewMode('couple')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      dietViewMode === 'couple'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>🍳 Cucina Insieme (x2)</span>
                  </button>

                  <button
                    onClick={() => setDietViewMode('partner')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      dietViewMode === 'partner'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>👥 {formData.partnerName || 'Partner'}</span>
                  </button>
                </div>
              )}

              {/* Partner Invite Banner if no partner diet is loaded yet */}
              {!formData.partnerMealPlanWeekly && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/20 rounded-[2rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                      <ChefHat className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[var(--text-main)]">Cucina insieme al tuo Partner 🍳</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Passagli la tua dieta con un QR: cucinerete gli stessi piatti calcolando le porzioni esatte per ciascuno!
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => { setShareSubtype('diet'); setShowShareModal(true); }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Invia Dieta</span>
                    </button>
                    <button
                      onClick={() => setShowReceiveModal(true)}
                      className="px-3.5 py-2 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Ricevi</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Macro Summary */}
              {(() => {
                const isPartnerView = dietViewMode === 'partner' && formData.partnerMealPlanWeekly;
                const currentPlan = isPartnerView ? formData.partnerMealPlanWeekly! : (activeMealPlanWeekly || []);
                const currentCalories = isPartnerView ? (formData.partnerTargetCalories || 0) : (formData.targetCalories || 0);
                const currentDay = currentPlan[expandedDayIndex || 0] || currentPlan[0];

                return (
                  <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                        <Target className="w-5 h-5 text-amber-500" />
                        {dietViewMode === 'partner' 
                          ? `Fabbisogno di ${formData.partnerName || 'Partner'}` 
                          : dietViewMode === 'couple' 
                          ? 'Porzioni Calibrate di Coppia' 
                          : 'Obiettivo Giornaliero'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setShareSubtype('diet'); setShowShareModal(true); }}
                          className="p-3 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500/20 transition-colors flex items-center gap-1 text-xs font-bold"
                          title="Invia la dieta al partner"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Invia</span>
                        </button>
                        <button onClick={() => setCurrentView('diet-wizard')} className="p-3 bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition-colors">
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-center mb-8">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                        {dietViewMode === 'partner' ? `Calorie Target Partner` : 'Calorie Target'}
                      </p>
                      <p className="text-5xl font-black text-amber-500">{currentCalories} <span className="text-xl text-[var(--text-muted)]">kcal</span></p>
                      <p className="text-xs font-semibold text-[var(--text-muted)] mt-2">
                        {dietViewMode === 'partner' 
                          ? `Piano alimentare personalizzato per ${formData.partnerName || 'Partner'}` 
                          : `BMR: ${formData.bmr || '—'} kcal • TDEE: ${formData.tdee || '—'} kcal`}
                      </p>
                    </div>

                    {currentDay && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[var(--bg)] p-4 rounded-2xl text-center border-b-4 border-blue-500">
                          <p className="text-lg font-black text-[var(--text-main)]">{Math.round(currentDay.totalCarbs)}g</p>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Carboidrati</p>
                        </div>
                        <div className="bg-[var(--bg)] p-4 rounded-2xl text-center border-b-4 border-red-500">
                          <p className="text-lg font-black text-[var(--text-main)]">{Math.round(currentDay.totalProtein)}g</p>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Proteine</p>
                        </div>
                        <div className="bg-[var(--bg)] p-4 rounded-2xl text-center border-b-4 border-yellow-500">
                          <p className="text-lg font-black text-[var(--text-main)]">{Math.round(currentDay.totalFat)}g</p>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Grassi</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Day Selector */}
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => setExpandedDayIndex(idx)}
                    className={`px-4 py-3 rounded-2xl font-bold whitespace-nowrap transition-all flex-1 text-center ${
                      (expandedDayIndex || 0) === idx
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-variant)]'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Meals for selected day */}
              {(() => {
                const isPartnerView = dietViewMode === 'partner' && formData.partnerMealPlanWeekly;
                const activePlan = isPartnerView ? formData.partnerMealPlanWeekly! : (activeMealPlanWeekly || []);
                const selectedDay = activePlan[expandedDayIndex || 0] || activePlan[0];
                const partnerDay = formData.partnerMealPlanWeekly?.[expandedDayIndex || 0] || formData.partnerMealPlanWeekly?.[0];

                if (!selectedDay) return null;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-2 mr-1">
                      <h4 className="font-bold text-[var(--text-muted)] uppercase tracking-widest text-xs">
                        {dietViewMode === 'couple' ? 'Pasti di Coppia (Cucina Insieme)' : isPartnerView ? `Pasti di ${formData.partnerName || 'Partner'}` : 'Pasti Consigliati del Giorno'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleToggleAllMealNotifications(true)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[10px] font-extrabold transition-colors flex items-center gap-1 border border-amber-500/20"
                          title="Attiva le notifiche per tutti i pasti di questo piano"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Attiva Tutti</span>
                        </button>
                        <button 
                          onClick={() => handleToggleAllMealNotifications(false)}
                          className="px-2 py-1 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] rounded-xl text-[10px] font-bold transition-colors"
                          title="Disattiva tutte le notifiche dei pasti"
                        >
                          Off
                        </button>
                      </div>
                    </div>

                    {selectedDay.meals.map((meal, idx) => {
                      const key = `${expandedDayIndex || 0}_${idx}`;
                      const isSearching = isSearchingRecipe[key];
                      const mealTime = meal.time || (idx === 0 ? '08:00' : idx === 1 ? '10:30' : idx === 2 ? '13:00' : idx === 3 ? '16:30' : '20:00');
                      const partnerMeal = partnerDay?.meals?.[idx];

                      return (
                      <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] overflow-hidden shadow-sm transition-all hover:border-amber-500/30">
                        {/* Card Header */}
                        <div className="p-5 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pasto {idx + 1}</span>
                                
                                {/* Time Badge Input */}
                                <div className="flex items-center gap-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-2 py-0.5 text-xs font-bold text-[var(--text-main)] shadow-inner">
                                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                  <input 
                                    type="time" 
                                    value={mealTime} 
                                    onChange={(e) => handleUpdateMealTime(expandedDayIndex || 0, idx, e.target.value)}
                                    className="bg-transparent text-[var(--text-main)] font-extrabold text-xs outline-none cursor-pointer w-14"
                                  />
                                </div>

                                {/* Notification Toggle Button */}
                                <button
                                  onClick={() => handleToggleMealNotification(expandedDayIndex || 0, idx)}
                                  className={`px-2 py-0.5 rounded-xl border transition-all flex items-center gap-1 text-[10px] font-extrabold ${
                                    meal.notificationsEnabled 
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' 
                                      : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)] hover:border-amber-500 hover:text-amber-500'
                                  }`}
                                  title={meal.notificationsEnabled ? `Notifica attiva per le ${mealTime}` : `Attiva notifica per le ${mealTime}`}
                                >
                                  <Bell className="w-3 h-3 shrink-0" />
                                  <span>{meal.notificationsEnabled ? 'Notifica ON' : 'Notifica'}</span>
                                </button>
                              </div>
                              <h5 className="font-bold text-base text-[var(--text-main)] leading-tight">{meal.name}</h5>
                            </div>

                            <div className="text-right shrink-0 ml-3 bg-amber-500/10 rounded-2xl px-3 py-2">
                              <p className="font-black text-lg text-amber-500 leading-none">{meal.calories}</p>
                              <p className="text-[10px] font-bold text-amber-500/70 uppercase">kcal</p>
                            </div>
                          </div>
                          <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">{meal.description}</p>

                          {/* Dual-Portion Comparison Card for Couple Cooking */}
                          {partnerMeal && (dietViewMode === 'couple' || (!isPartnerView && formData.partnerMealPlanWeekly)) && (
                            <div className="mt-2 bg-[var(--bg)] border border-amber-500/20 rounded-2xl p-3.5 space-y-2.5 shadow-inner">
                              <div className="flex items-center justify-between text-xs font-black text-amber-500">
                                <span className="flex items-center gap-1.5">
                                  <ChefHat className="w-4 h-4" /> Porzioni di Coppia (Stessa Ricetta)
                                </span>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cucina Insieme</span>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border)] flex flex-col justify-between">
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-[var(--text-main)]">👤 Tu</span>
                                    <span className="text-amber-500 font-black">{meal.calories} kcal</span>
                                  </div>
                                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-semibold">
                                    🍞 {meal.carbs}g • 💪 {meal.protein}g • 🫒 {meal.fat}g
                                  </p>
                                </div>

                                <div className="bg-[var(--card-bg)] p-3 rounded-xl border border-amber-500/30 flex flex-col justify-between">
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-[var(--text-main)]">👥 {formData.partnerName || 'Partner'}</span>
                                    <span className="text-amber-500 font-black">{partnerMeal.calories} kcal</span>
                                  </div>
                                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-semibold">
                                    🍞 {partnerMeal.carbs}g • 💪 {partnerMeal.protein}g • 🫒 {partnerMeal.fat}g
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="border-t border-[var(--border)] bg-[var(--bg)] px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                            <span className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-lg">🍞 {meal.carbs}g</span>
                            <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-lg">💪 {meal.protein}g</span>
                            <span className="bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-lg">🫒 {meal.fat}g</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setSwappingMealInfo({ dayIndex: expandedDayIndex || 0, mealIndex: idx, meal })}
                              className="px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                              title="Sostituisci questo piatto con un'alternativa"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Cambia Piatto</span>
                            </button>

                            {!meal.isSimple && (
                              <button 
                                onClick={() => loadAndFindRecipe(meal.name, meal.description, key, meal.recipeUrl)}
                                disabled={isSearching}
                                className="px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                              >
                                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Ricetta 📖</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Dish Swap Modal */}
        <AnimatePresence>
          {swappingMealInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwappingMealInfo(null)}
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 lg:p-8 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                      <span>🍽️</span> Cambia Piatto
                    </h3>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">
                      Sostituisci <span className="text-amber-500 font-bold">{swappingMealInfo.meal.name}</span> con un'alternativa bilanciata
                    </p>
                  </div>
                  <button 
                    onClick={() => setSwappingMealInfo(null)}
                    className="p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Alternatives List */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
                  {(() => {
                    const currentTemplate = MEAL_LIBRARY.find(m => m.name === swappingMealInfo.meal.name);
                    const targetType = currentTemplate ? currentTemplate.type : (swappingMealInfo.mealIndex === 0 ? 'breakfast' : swappingMealInfo.mealIndex === 3 ? 'snack' : 'lunch');
                    
                    const alternatives = getMealsByType(targetType, dietProfile.restrictions)
                      .filter(m => m.name !== swappingMealInfo.meal.name);

                    if (alternatives.length === 0) {
                      return (
                        <div className="py-12 text-center text-[var(--text-muted)]">
                          <p className="font-bold">Nessun'altra alternativa disponibile per i tuoi filtri dietetici.</p>
                        </div>
                      );
                    }

                    return alternatives.map((alt, i) => (
                      <div 
                        key={i}
                        className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3 hover:border-amber-500/50 transition-all group shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className="font-bold text-base text-[var(--text-main)] group-hover:text-amber-500 transition-colors leading-tight">{alt.name}</h4>
                            <p className="text-xs text-[var(--text-muted)] mt-1 font-medium leading-relaxed">{alt.description}</p>
                          </div>
                          <div className="text-right shrink-0 bg-amber-500/10 px-3 py-1.5 rounded-xl">
                            <span className="font-black text-sm text-amber-500">{alt.baseCalories}</span>
                            <span className="text-[10px] font-bold text-amber-500/70 ml-1">kcal</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <span className="text-blue-500">🍞 {alt.baseCarbs}g</span>
                            <span className="text-red-500">💪 {alt.baseProtein}g</span>
                            <span className="text-yellow-500">🫒 {alt.baseFat}g</span>
                          </div>
                          <button
                            onClick={() => handleSwapMeal(alt)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
                          >
                            Scegli Questo ✨
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── MODAL 1: CONDIVIDI CON PARTNER ────────────────────── */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-[var(--text-main)]">Condividi con il Partner</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Passa la tua scheda o la tua dieta</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Subtype Selector */}
                <div className="my-5 flex bg-[var(--surface-variant)] p-1.5 rounded-2xl gap-1 border border-[var(--border)] shrink-0">
                  {formData.mealPlanWeekly && (
                    <button
                      onClick={() => setShareSubtype('diet')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        shareSubtype === 'diet'
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Solo Dieta</span>
                    </button>
                  )}
                  {formData.workoutPlan && (
                    <button
                      onClick={() => setShareSubtype('workout')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        shareSubtype === 'workout'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>Solo Fitness</span>
                    </button>
                  )}
                  {formData.mealPlanWeekly && formData.workoutPlan && (
                    <button
                      onClick={() => setShareSubtype('all')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        shareSubtype === 'all'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tutto</span>
                    </button>
                  )}
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center my-2 shrink-0">
                  <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xl border-4 border-white/80 inline-block">
                    <SafeQRCode 
                      value={sharePayload} 
                      size={210} 
                      level="L" 
                    />
                  </div>
                  <p className="text-xs text-center text-[var(--text-muted)] font-semibold mt-4 max-w-xs leading-relaxed">
                    {sharePayload.length > 2100 ? (
                      <span>Tocca <b>Invia ad App</b> per inviare l'intero piano via WhatsApp o Telegram.</span>
                    ) : (
                      <span>Fai inquadrare questo QR al tuo partner dalla sua app Chelona (tasto <b>Ricevi da Partner</b>) per importare il piano in 1 secondo!</span>
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-[var(--border)] shrink-0">
                  <button
                    onClick={handleCopyShareCode}
                    className="py-3.5 px-4 bg-[var(--surface-variant)] hover:bg-[var(--border)] active:scale-95 text-[var(--text-main)] font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 border border-[var(--border)]"
                  >
                    {hasCopiedShareCode ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-500">Copiato! ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                        <span>Copia Codice</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleShareNative}
                    className="py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Invia ad App</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── MODAL 2: RICEVI DA PARTNER ────────────────────────── */}
        <AnimatePresence>
          {showReceiveModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReceiveModal(false)}
              className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-[var(--text-main)]">Ricevi da Partner</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Scansiona o incolla la scheda/dieta</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowReceiveModal(false)}
                    className="p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Main Action: Camera Scanner */}
                <div className="my-6 space-y-4">
                  <button
                    onClick={() => setIsScanningPartnerQr(true)}
                    className="w-full p-6 bg-gradient-to-br from-emerald-500 to-teal-600 hover:opacity-95 active:scale-[0.98] text-white rounded-3xl shadow-xl shadow-emerald-500/25 transition-all flex flex-col items-center justify-center gap-3 group text-center"
                  >
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-black text-lg">Inquadra il QR del Partner</p>
                      <p className="text-xs text-white/80 font-medium mt-0.5">Apri la fotocamera e inquadra lo schermo del partner</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-3 my-4">
                    <div className="h-[1px] bg-[var(--border)] flex-1" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">oppure incolla codice</span>
                    <div className="h-[1px] bg-[var(--border)] flex-1" />
                  </div>

                  {/* Manual Paste */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      Codice condiviso (es. via WhatsApp)
                    </label>
                    <textarea
                      rows={3}
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      placeholder="Incolla qui il codice LZW:... ricevuto dal partner"
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3 text-xs text-[var(--text-main)] font-mono outline-none focus:border-emerald-500 resize-none transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (!manualCodeInput.trim()) {
                          alert("Incolla prima il codice.");
                          return;
                        }
                        processIncomingData(manualCodeInput);
                      }}
                      disabled={!manualCodeInput.trim()}
                      className="w-full py-3 bg-[var(--card-bg)] border border-[var(--border)] hover:border-emerald-500 hover:bg-emerald-500/10 text-[var(--text-main)] hover:text-emerald-500 font-bold text-xs rounded-xl transition-all disabled:opacity-40"
                    >
                      Analizza e Importa Codice
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── FULLSCREEN QR SCANNER ─────────────────────────────── */}
        {isScanningPartnerQr && (
          <QrScanner
            onScan={(decodedText) => processIncomingData(decodedText)}
            onClose={() => setIsScanningPartnerQr(false)}
          />
        )}

        {/* ─── MODAL 3: DIALOGO INTELLIGENTE IMPORTAZIONE E ADATTAMENTO ─── */}
        <AnimatePresence>
          {parsedIncomingData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setParsedIncomingData(null)}
              className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto custom-scrollbar space-y-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-[var(--text-main)]">Piano Partner Ricevuto!</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Scegli come importare i dati</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setParsedIncomingData(null)}
                    className="p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content Overview */}
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-muted)]">Nome Partner</span>
                    <input
                      type="text"
                      value={partnerDisplayName}
                      onChange={(e) => setPartnerDisplayName(e.target.value)}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-1 text-xs font-bold text-[var(--text-main)] text-right outline-none focus:border-amber-500 w-32"
                      placeholder="Partner"
                    />
                  </div>

                  {parsedIncomingData.mealPlanWeekly && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)]">
                      <span className="text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-amber-500" /> Dieta Ricevuta
                      </span>
                      <span className="font-extrabold text-[var(--text-main)]">
                        {parsedIncomingData.mealPlanWeekly.length} giorni • {parsedIncomingData.targetCalories || '—'} kcal
                      </span>
                    </div>
                  )}

                  {parsedIncomingData.workoutPlan && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)]">
                      <span className="text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
                        <Dumbbell className="w-4 h-4 text-emerald-500" /> Scheda Allenamento
                      </span>
                      <span className="font-extrabold text-[var(--text-main)]">
                        {parsedIncomingData.workoutPlan.length} giorni di esercizi
                      </span>
                    </div>
                  )}
                </div>

                {/* DIET IMPORT OPTIONS */}
                {parsedIncomingData.mealPlanWeekly && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-amber-500" />
                        Opzioni per Cucinare Insieme
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        Vuoi cucinare gli stessi piatti ma con porzioni adatte al tuo fabbisogno calorico?
                      </p>
                    </div>

                    {/* Target Calories Input for Recipient */}
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[var(--text-main)]">
                          Le TUE Calorie Giornaliere:
                        </label>
                        <div className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-amber-500/30 rounded-xl px-3 py-1 shadow-sm">
                          <input
                            type="number"
                            value={customScaleCalories || ''}
                            onChange={(e) => setCustomScaleCalories(parseInt(e.target.value) || 0)}
                            className="bg-transparent font-black text-base text-amber-500 outline-none w-20 text-right"
                          />
                          <span className="text-xs font-bold text-[var(--text-muted)]">kcal</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Tutti i piatti del partner verranno ricalcolati esattamente per raggiungere {customScaleCalories} kcal. Potrete cucinare la stessa pietanza pesando le rispettive porzioni!
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {/* Option 1: Scale & Cook Together (Recommended) */}
                      <button
                        onClick={() => handleApplyImport('scale_diet')}
                        className="w-full p-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-left shadow-lg shadow-amber-500/20 transition-all flex items-start gap-3.5 group active:scale-[0.98]"
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                          <ChefHat className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm">Cuciniamo Insieme (Consigliato)</p>
                            <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Top</span>
                          </div>
                          <p className="text-xs text-white/90 mt-0.5 font-medium leading-relaxed">
                            Stessi identici piatti del partner, ma porzioni e grammi ricalcolati sulle tue <b>{customScaleCalories} kcal</b>.
                          </p>
                        </div>
                      </button>

                      {/* Option 2: Exact 1:1 */}
                      <button
                        onClick={() => handleApplyImport('exact_diet')}
                        className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] hover:border-amber-500/50 rounded-2xl text-left transition-all flex items-start gap-3.5 group active:scale-[0.98]"
                      >
                        <div className="w-8 h-8 rounded-xl bg-[var(--surface-variant)] flex items-center justify-center shrink-0 mt-0.5 text-[var(--text-muted)] group-hover:text-amber-500">
                          <Copy className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-[var(--text-main)] group-hover:text-amber-500 transition-colors">
                            Copia Esatta 1:1 ({parsedIncomingData.targetCalories || '—'} kcal)
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium leading-relaxed">
                            Importa la dieta tale e quale con le stesse identiche grammature del partner.
                          </p>
                        </div>
                      </button>

                      {/* Option 3: Save as Partner Only */}
                      <button
                        onClick={() => handleApplyImport('partner_diet_only')}
                        className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] hover:border-indigo-500/50 rounded-2xl text-left transition-all flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      >
                        <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Salva solo come scheda partner (mantieni la mia dieta attuale)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* WORKOUT IMPORT OPTIONS */}
                {parsedIncomingData.workoutPlan && (
                  <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                    <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-emerald-500" />
                      Scheda Allenamento
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => handleApplyImport('replace_workout')}
                        className="p-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-left text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex flex-col justify-between gap-1"
                      >
                        <span className="font-black text-sm">Adotta Questa Scheda</span>
                        <span className="text-[11px] opacity-90 font-normal">Sostituisci il tuo attuale piano allenamento</span>
                      </button>

                      <button
                        onClick={() => handleApplyImport('partner_workout_only')}
                        className="p-3.5 bg-[var(--bg)] border border-[var(--border)] hover:border-emerald-500 text-[var(--text-main)] rounded-2xl text-left text-xs font-bold transition-all flex flex-col justify-between gap-1"
                      >
                        <span className="font-black text-sm">Salva come Scheda Partner</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-normal">Tienila memorizzata per consultarla</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* IMPORT ALL OPTION */}
                {parsedIncomingData.mealPlanWeekly && parsedIncomingData.workoutPlan && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleApplyImport('all')}
                      className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-500/25 transition-all hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Sincronizza Tutto Insieme (Fitness + Dieta Calibrata)</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
