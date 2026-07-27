import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, RefreshCw, Play, Award, TrendingUp, Target, Activity, Heart, Dumbbell, Utensils, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findRecipeForMeal } from '../services/recipeSearchService';

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
  goal: 'mass' | 'cut' | 'strength' | 'endurance' | 'tone';
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
  goal: 'cut' | 'maintain' | 'bulk';
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
  { name: 'Panca Piana con Bilanciere', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0025.gif', compound: true },
  { name: 'Panca Inclinata con Manubri', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0314.gif', compound: true },
  { name: 'Croci ai Cavi', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1320.gif', compound: false },
  { name: 'Chest Press', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1301.gif', compound: true },
  { name: 'Push-up', muscleGroup: 'chest', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0662.gif', compound: true },
  { name: 'Push-up Diamante', muscleGroup: 'chest', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0283.gif', compound: true },
  { name: 'Dip alle Parallele', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0251.gif', compound: true },
  { name: 'Panca Declinata', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0033.gif', compound: true },
  { name: 'Croci con Manubri', muscleGroup: 'chest', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0308.gif', compound: false },
  { name: 'Pectoral Machine', muscleGroup: 'chest', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0335.gif', compound: false },
  // Back
  { name: 'Trazioni alla Sbarra', muscleGroup: 'back', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0652.gif', compound: true },
  { name: 'Lat Machine', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2330.gif', compound: true },
  { name: 'Rematore con Bilanciere', muscleGroup: 'back', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0027.gif', compound: true },
  { name: 'Rematore con Manubrio', muscleGroup: 'back', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0293.gif', compound: true },
  { name: 'Pulley Basso', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0159.gif', compound: true },
  { name: 'T-Bar Row', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1349.gif', compound: true },
  { name: 'Pull-up Presa Larga', muscleGroup: 'back', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1429.gif', compound: true },
  { name: 'Rematore ai Cavi', muscleGroup: 'back', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0159.gif', compound: true },
  { name: 'Pullover con Manubrio', muscleGroup: 'back', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0375.gif', compound: false },
  { name: 'Australian Pull-up', muscleGroup: 'back', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0499.gif', compound: true },
  // Shoulders
  { name: 'Military Press con Bilanciere', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0086.gif', compound: true },
  { name: 'Alzate Laterali', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0334.gif', compound: false },
  { name: 'Arnold Press', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2137.gif', compound: true },
  { name: 'Face Pull', muscleGroup: 'shoulders', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0182.gif', compound: false },
  { name: 'Alzate Frontali', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0310.gif', compound: false },
  { name: 'Shoulder Press con Manubri', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0361.gif', compound: true },
  { name: 'Tirate al Mento', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0120.gif', compound: true },
  { name: 'Alzate a 90 Gradi', muscleGroup: 'shoulders', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0993.gif', compound: false },
  { name: 'Lateral Raise al Cavo', muscleGroup: 'shoulders', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0178.gif', compound: false },
  // Biceps
  { name: 'Curl con Bilanciere', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0031.gif', compound: false },
  { name: 'Curl con Manubri', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0285.gif', compound: false },
  { name: 'Curl Martello', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0165.gif', compound: false },
  { name: 'Curl Concentrato', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0976.gif', compound: false },
  { name: 'Curl alla Panca Scott', muscleGroup: 'biceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0059.gif', compound: false },
  { name: 'Curl ai Cavi', muscleGroup: 'biceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0868.gif', compound: false },
  { name: 'Curl Inverso', muscleGroup: 'biceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0080.gif', compound: false },
  // Triceps
  { name: 'French Press', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1736.gif', compound: false },
  { name: 'Push-down ai Cavi', muscleGroup: 'triceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0241.gif', compound: false },
  { name: 'Dip su Panca', muscleGroup: 'triceps', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0129.gif', compound: true },
  { name: 'Tricipiti ai Cavi con Corda', muscleGroup: 'triceps', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0242.gif', compound: false },
  { name: 'Kickback con Manubrio', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0393.gif', compound: false },
  { name: 'Estensioni Overhead', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0092.gif', compound: false },
  { name: 'Skull Crusher', muscleGroup: 'triceps', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0060.gif', compound: false },
  // Quads
  { name: 'Squat con Bilanciere', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0102.gif', compound: true },
  { name: 'Pressa', muscleGroup: 'quads', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2287.gif', compound: true },
  { name: 'Leg Extension', muscleGroup: 'quads', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0585.gif', compound: false },
  { name: 'Affondi con Manubri', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0336.gif', compound: true },
  { name: 'Squat Frontale', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0042.gif', compound: true },
  { name: 'Hack Squat', muscleGroup: 'quads', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0046.gif', compound: true },
  { name: 'Goblet Squat', muscleGroup: 'quads', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1760.gif', compound: true },
  { name: 'Squat a Corpo Libero', muscleGroup: 'quads', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3168.gif', compound: true },
  { name: 'Sissy Squat', muscleGroup: 'quads', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1489.gif', compound: false },
  // Hamstrings
  { name: 'Stacco Rumeno', muscleGroup: 'hamstrings', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0085.gif', compound: true },
  { name: 'Leg Curl Sdraiato', muscleGroup: 'hamstrings', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0586.gif', compound: false },
  { name: 'Leg Curl Seduto', muscleGroup: 'hamstrings', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0599.gif', compound: false },
  { name: 'Stacco a Gamba Singola', muscleGroup: 'hamstrings', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1756.gif', compound: true },
  { name: 'Nordic Curl', muscleGroup: 'hamstrings', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3389.gif', compound: true },
  { name: 'Good Morning', muscleGroup: 'hamstrings', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0044.gif', compound: true },
  // Glutes
  { name: 'Hip Thrust con Bilanciere', muscleGroup: 'glutes', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1062.gif', compound: true },
  { name: 'Ponte Glutei', muscleGroup: 'glutes', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1409.gif', compound: true },
  { name: 'Squat Sumo', muscleGroup: 'glutes', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3142.gif', compound: true },
  { name: 'Kick-back ai Cavi', muscleGroup: 'glutes', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0172.gif', compound: false },
  { name: 'Step-up', muscleGroup: 'glutes', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1008.gif', compound: true },
  { name: 'Abduzioni', muscleGroup: 'glutes', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1427.gif', compound: false },
  { name: 'Hip Thrust a Corpo Libero', muscleGroup: 'glutes', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3236.gif', compound: true },
  // Calves
  { name: 'Calf Raise in Piedi', muscleGroup: 'calves', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1372.gif', compound: false },
  { name: 'Calf Raise Seduto', muscleGroup: 'calves', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0088.gif', compound: false },
  { name: 'Calf Raise su Gradino', muscleGroup: 'calves', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0999.gif', compound: false },
  { name: 'Calf Raise alla Pressa', muscleGroup: 'calves', equipment: ['gym'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1385.gif', compound: false },
  // Abs
  { name: 'Crunch', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0972.gif', compound: false },
  { name: 'Plank', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3544.gif', compound: true },
  { name: 'Leg Raise', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0012.gif', compound: false },
  { name: 'Russian Twist', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0687.gif', compound: false },
  { name: 'Mountain Climber', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0630.gif', compound: true },
  { name: 'Bicycle Crunch', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0972.gif', compound: false },
  { name: 'Ab Wheel', muscleGroup: 'abs', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0103.gif', compound: true },
  { name: 'Crunch Inverso', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0872.gif', compound: false },
  { name: 'V-up', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0969.gif', compound: false },
  { name: 'Dead Bug', muscleGroup: 'abs', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0276.gif', compound: false },
  // Full Body
  { name: 'Burpee', muscleGroup: 'full_body', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1160.gif', compound: true },
  { name: 'Clean and Press', muscleGroup: 'full_body', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0028.gif', compound: true },
  { name: 'Thruster', muscleGroup: 'full_body', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3305.gif', compound: true },
  { name: 'Turkish Get-up', muscleGroup: 'full_body', equipment: ['gym', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3374.gif', compound: true },
  { name: 'Bear Crawl', muscleGroup: 'full_body', equipment: ['gym', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3360.gif', compound: true },
  // Esercizi con Elastici & Mini-Band
  { name: 'Chest Press con Elastico', muscleGroup: 'chest', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0662.gif', compound: true },
  { name: 'Croci con Elastico', muscleGroup: 'chest', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0308.gif', compound: false },
  { name: 'Rematore con Elastico', muscleGroup: 'back', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0027.gif', compound: true },
  { name: 'Lat Pulldown con Elastico', muscleGroup: 'back', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2330.gif', compound: true },
  { name: 'Face Pull con Elastico', muscleGroup: 'shoulders', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0182.gif', compound: false },
  { name: 'Alzate Laterali con Elastico', muscleGroup: 'shoulders', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0334.gif', compound: false },
  { name: 'Shoulder Press con Elastico', muscleGroup: 'shoulders', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0361.gif', compound: true },
  { name: 'Curl Bicipiti con Elastico', muscleGroup: 'biceps', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0031.gif', compound: false },
  { name: 'Pushdown Tricipiti con Elastico', muscleGroup: 'triceps', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0241.gif', compound: false },
  { name: 'Squat con Elastico', muscleGroup: 'quads', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0102.gif', compound: true },
  { name: 'Hip Thrust con Mini-Band', muscleGroup: 'glutes', equipment: ['bands', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1060.gif', compound: true },
  { name: 'Abduzioni Glutei con Mini-Band', muscleGroup: 'glutes', equipment: ['bands', 'home', 'bodyweight'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0993.gif', compound: false },
  { name: 'Glute Kickback con Elastico', muscleGroup: 'glutes', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0393.gif', compound: false },
  { name: 'Stacco Rumeno con Elastico', muscleGroup: 'hamstrings', equipment: ['bands', 'home'], gifUrl: 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0027.gif', compound: true }
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
      <header className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-6 flex items-center justify-between shrink-0 z-20 safe-area-header">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-2xl transition-all shadow-sm">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">{formData.title}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {currentView === 'catalog' ? 'Seleziona un percorso' : 
               currentView.includes('wizard') ? 'Configurazione' : 'Piano Attivo'}
            </p>
          </div>
        </div>
      </header>

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
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Il tuo obiettivo</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'mass', label: 'Massa Muscolare', icon: '💪' },
                      { id: 'cut', label: 'Dimagrimento', icon: '🔥' },
                      { id: 'strength', label: 'Forza', icon: '🏋️‍♂️' },
                      { id: 'tone', label: 'Tonificazione', icon: '✨' }
                    ].map(opt => (
                      <button key={opt.id} onClick={() => { setFitProfile({...fitProfile, goal: opt.id as any}); setFitWizardStep(5); }} className={`w-full p-5 flex items-center gap-4 text-left rounded-3xl border-2 transition-all ${fitProfile.goal === opt.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                        <span className="text-3xl">{opt.icon}</span>
                        <p className="font-bold text-lg text-[var(--text-main)]">{opt.label}</p>
                      </button>
                    ))}
                  </div>
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
                  <h3 className="text-2xl font-black text-[var(--text-main)] text-center">Obiettivo di peso</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'cut', label: 'Perdita di Peso', desc: 'Deficit calorico per bruciare grassi' },
                      { id: 'maintain', label: 'Mantenimento', desc: 'Mantenere il peso attuale' },
                      { id: 'bulk', label: 'Aumento Massa', desc: 'Surplus calorico per costruire muscoli' }
                    ].map(opt => (
                      <button key={opt.id} onClick={() => { setDietProfile({...dietProfile, goal: opt.id as any}); setDietWizardStep(5); }} className={`w-full p-6 text-left rounded-3xl border-2 transition-all ${dietProfile.goal === opt.id ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--card-bg)]'}`}>
                        <p className="font-bold text-lg text-[var(--text-main)]">{opt.label}</p>
                        <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
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
        {currentView === 'fitness-plan' && formData.workoutPlan && (
          <div className="px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Profile Summary */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 flex flex-wrap items-center gap-4 justify-between">
                <div>
                  <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-emerald-500" />
                    Il tuo Piano Allenamento
                  </h3>
                  <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">
                    {formData.fitnessProfile?.daysPerWeek} giorni/settimana • Obiettivo: {formData.fitnessProfile?.goal}
                  </p>
                </div>
                <button onClick={() => setCurrentView('fitness-wizard')} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-colors">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {/* Workout Days */}
              <div className="space-y-4">
                {formData.workoutPlan.map((day, idx) => (
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
        {currentView === 'diet-plan' && activeMealPlanWeekly && (
          <div className="px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Macro Summary */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-500" />
                    Obiettivo Giornaliero
                  </h3>
                  <button onClick={() => setCurrentView('diet-wizard')} className="p-3 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500/20 transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center mb-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Calorie Target</p>
                  <p className="text-5xl font-black text-amber-500">{formData.targetCalories} <span className="text-xl text-[var(--text-muted)]">kcal</span></p>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-2">BMR: {formData.bmr} kcal • TDEE: {formData.tdee} kcal</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[var(--bg)] p-4 rounded-2xl text-center border-b-4 border-blue-500">
                    <p className="text-lg font-black text-[var(--text-main)]">{Math.round(activeMealPlanWeekly[expandedDayIndex || 0].totalCarbs)}g</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Carboidrati</p>
                  </div>
                  <div className="bg-[var(--bg)] p-4 rounded-2xl text-center border-b-4 border-red-500">
                    <p className="text-lg font-black text-[var(--text-main)]">{Math.round(activeMealPlanWeekly[expandedDayIndex || 0].totalProtein)}g</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Proteine</p>
                  </div>
                  <div className="bg-[var(--bg)] p-4 rounded-2xl text-center border-b-4 border-yellow-500">
                    <p className="text-lg font-black text-[var(--text-main)]">{Math.round(activeMealPlanWeekly[expandedDayIndex || 0].totalFat)}g</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Grassi</p>
                  </div>
                </div>
              </div>

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
              <div className="space-y-4">
                <h4 className="font-bold text-[var(--text-muted)] uppercase tracking-widest text-xs ml-2">Pasti Consigliati del Giorno</h4>
                {activeMealPlanWeekly[expandedDayIndex || 0].meals.map((meal, idx) => {
                  const key = `${expandedDayIndex || 0}_${idx}`;

                  const isSearching = isSearchingRecipe[key];
                  
                  return (
                  <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] overflow-hidden shadow-sm">
                    {/* Card Header */}
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Pasto {idx + 1}</p>
                          <h5 className="font-bold text-base text-[var(--text-main)] leading-tight">{meal.name}</h5>
                        </div>
                        <div className="text-right shrink-0 ml-3 bg-amber-500/10 rounded-2xl px-3 py-2">
                          <p className="font-black text-lg text-amber-500 leading-none">{meal.calories}</p>
                          <p className="text-[10px] font-bold text-amber-500/70 uppercase">kcal</p>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">{meal.description}</p>
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
      </div>
    </div>
  );
}
