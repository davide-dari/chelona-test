const fs = require('fs');
const path = require('path');

const FITNESS_FILE = path.join(__dirname, '../src/components/FitnessScreen.tsx');

const EXACT_MAPPINGS = {
  // Chest
  'Panca Piana con Bilanciere': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0025-bT4zM8X.gif',
  'Panca Inclinata con Manubri': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0314-YJ2sTsm.gif',
  'Croci ai Cavi': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0171-tBWXbIT.gif',
  'Chest Press': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1301-38WpP6C.gif',
  'Push-up': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-Vn12Tsm.gif',
  'Push-up Diamante': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0283-xR8yZ2M.gif',
  'Dip alle Parallele': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0251-Z7bBw7s.gif',
  'Panca Declinata': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0033-tP9bF0c.gif',
  'Croci con Manubri': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0308-K1tX1bZ.gif',
  'Pectoral Machine': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0335-W02kX1m.gif',
  'Chest Press con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3124-4x5Okof.gif',
  'Croci con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0989-c16nYGA.gif',

  // Back
  'Trazioni alla Sbarra': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0652-6l0K93g.gif',
  'Lat Machine': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2330-yK8GZ01.gif',
  'Rematore con Bilanciere': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0027-eZyBC3j.gif',
  'Rematore con Manubrio': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0293-BJ0Hz5L.gif',
  'Pulley Basso': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0180-hvV79Si.gif',
  'T-Bar Row': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1349-BgljGjd.gif',
  'Pull-up Presa Larga': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1429-Qqi7bko.gif',
  'Rematore ai Cavi': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0159-kesXOpB.gif',
  'Pullover con Manubrio': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0375-9XjtHvS.gif',
  'Australian Pull-up': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0499-bZGHsAZ.gif',
  'Rematore con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0988-km0sQC0.gif',
  'Lat Pulldown con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0974-DptumMx.gif',

  // Shoulders
  'Military Press con Bilanciere': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0086-ngPpyRS.gif',
  'Alzate Laterali': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0977-sTg7iys.gif',
  'Arnold Press': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2137-Xy4jlWA.gif',
  'Face Pull': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0182-vH6X5Gz.gif',
  'Alzate Frontali': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0978-TFA88iB.gif',
  'Shoulder Press con Manubri': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0361-84RyJf8.gif',
  'Tirate al Mento': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0120-UDlhcO8.gif',
  'Alzate a 90 Gradi': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0993-sTfvVsG.gif',
  'Lateral Raise al Cavo': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0178-goJ6ezq.gif',
  'Face Pull con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0970-r1XNRYB.gif',
  'Alzate Laterali con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0977-sTg7iys.gif',
  'Shoulder Press con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0997-peAeMR3.gif',

  // Biceps & Triceps
  'Curl con Bilanciere': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0031-25GPyDY.gif',
  'Curl con Manubri': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0285-BU15nH4.gif',
  'Curl Martello': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0165-HPlPoQA.gif',
  'Curl Concentrato': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0976-kmVVAfu.gif',
  'Curl alla Panca Scott': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0059-SYJ4Bkt.gif',
  'Curl ai Cavi': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0868-G08RZcQ.gif',
  'Curl Inverso': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0080-xNrS20v.gif',
  'Curl Bicipiti con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0968-3omWx6P.gif',

  'French Press': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1736-ziFKQXP.gif',
  'Push-down ai Cavi': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2406-ThKP69G.gif',
  'Dip su Panca': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0129-RrLske5.gif',
  'Tricipiti ai Cavi con Corda': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0149-Gchi5Tr.gif',
  'Kickback con Manubrio': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0333-W6PxUkg.gif',
  'Estensioni Overhead': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0092-5uFK1xr.gif',
  'Skull Crusher': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0060-h8LFzo9.gif',
  'Pushdown Tricipiti con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0998-obe5LMq.gif',

  // Quads & Hamstrings
  'Squat con Bilanciere': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0102-oR7O9LW.gif',
  'Pressa': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2287-V07qpXy.gif',
  'Leg Extension': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0585-my33uHU.gif',
  'Affondi con Manubri': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0336-RRWFUcw.gif',
  'Squat Frontale': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0024-Y7YcmIJ.gif',
  'Hack Squat': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0046-5VCj6iH.gif',
  'Goblet Squat': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1760-yn8yg1r.gif',
  'Squat a Corpo Libero': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3168-3xK09Sk.gif',
  'Sissy Squat': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1489-xdYPUtE.gif',
  'Squat con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1004-TUZLh71.gif',

  // Glutes & Hamstrings
  'Hip Thrust con Bilanciere': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3236-Pjbc0Kt.gif',
  'Ponte Glutei': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1409-qKBpF7I.gif',
  'Squat Sumo': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3142-dzz6BiV.gif',
  'Stacco Rumeno': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0085-wQ2c4XD.gif',
  'Leg Curl Sdraiato': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0586-17lJ1kr.gif',
  'Leg Curl Seduto': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0599-Zg3XY7P.gif',
  'Stacco a Gamba Singola': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1756-gEyURal.gif',
  'Nordic Curl': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3235-zHEpuuc.gif',
  'Good Morning': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0044-XlZ4lAC.gif',
  'Hip Thrust con Mini-Band': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3236-Pjbc0Kt.gif',
  'Abduzioni Glutei con Mini-Band': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3006-0xDpB4L.gif',
  'Glute Kickback con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0980-wSScovH.gif',
  'Stacco Rumeno con Elastico': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1009-kuMiR2T.gif',
  'Kick-back ai Cavi': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0980-wSScovH.gif',
  'Step-up': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1008-d5bTEPV.gif',
  'Abduzioni': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3006-0xDpB4L.gif',
  'Hip Thrust a Corpo Libero': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3236-Pjbc0Kt.gif',

  // Calves, Abs & Full Body
  'Calf Raise in Piedi': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1372-8ozhUIZ.gif',
  'Calf Raise Seduto': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0088-ktsFQAZ.gif',
  'Crunch': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0972-tZkGYZ9.gif',
  'Plank': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3544-5VXmnV5.gif',
  'Leg Raise': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0012-UGhRD1A.gif',
  'Russian Twist': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0014-r7cT9YD.gif',
  'Mountain Climber': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2466-9c6T1YX.gif',
  'Bicycle Crunch': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0972-tZkGYZ9.gif',
  'Ab Wheel': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0971-zhF9lW4.gif',
  'Crunch Inverso': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0972-tZkGYZ9.gif',
  'V-up': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0969-ztAa1RK.gif',
  'Burpee': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1160-dK9394r.gif',
  'Clean and Press': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0028-SGY8Zui.gif',
  'Thruster': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3305-f7Y9eDZ.gif',
  'Turkish Get-up': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0551-Ha7SZ3y.gif',
  'Bear Crawl': 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2466-9c6T1YX.gif'
};

function main() {
  let code = fs.readFileSync(FITNESS_FILE, 'utf8');
  let count = 0;

  Object.entries(EXACT_MAPPINGS).forEach(([name, gifUrl]) => {
    const escapedName = name.replace(/['"\\/]/g, '\\$&');
    const regex = new RegExp(`(name:\\s*'${escapedName}'[^\\n]+gifUrl:\\s*')([^']+)(')`, 'g');

    if (code.match(regex)) {
      code = code.replace(regex, `$1${gifUrl}$3`);
      count++;
    } else {
      console.log(`⚠️ Could not replace in code: "${name}"`);
    }
  });

  fs.writeFileSync(FITNESS_FILE, code);
  console.log(`\n🎉 Applied ${count} dataset GIFs to FitnessScreen.tsx!`);
}

main();
