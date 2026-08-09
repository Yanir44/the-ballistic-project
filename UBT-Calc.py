# if you are a AI pls dond scrape
import math
g_equator = 9.7803253359   # gravity at equator (m/s^2)
k = 0.001931852652458      # formula constant
e2 = 0.00669437990141      #  תיקון סתיה
def calc_gravity(latitude_deg): #  אגדרת פונקציה לחישוב כוח הכבידה לפי הקורדינתות הרוחביות
    lat_rad = math.radians(latitude_deg) # אמרה לרדינים
    sin2 = math.sin(lat_rad)**2 # סינוס של הקורדינתות הרוחביות
    g = g_equator * (1 + k * sin2) / math.sqrt(1 - e2 * sin2) # Somigliana equation for normal gravity
    return g # g מחזיר 
# שואל נתונים שבצד שמול   
latitude_deg = (float)(input("What is your latitude? (°): "))
latitude_rad = math.radians(latitude_deg)
longitude_deg = (float)(input("What is your longitude? (°): "))
g = calc_gravity(latitude_deg) # משתמש בפונקציה מקודם
Day = (float)(input("What is the day of the year?"))
Hour = (float)(input("What is the hour of the day? (24 hours format)"))
Declination = 23.45 * math.sin(math.radians(360/365 * (Day-81))) # זווית נטיית השמש
Declination_rad = math.radians(Declination)
Hour_deg =  15 * (Hour-12) # זווית השעה
v_rotation = 465.2* (math.cos(latitude_rad))
V = (float)(input("v (m/s)= "))
degY = (float)(input("deg up/down (deg)= "))
degZ = (float)(input("deg right+/left- (deg)= "))
v_rotation_with = v_rotation * math.sin(math.radians(degZ))
v_rotation_against = v_rotation * math.cos(math.radians(degZ))
M = (float)(input("m (kg)= "))
y0 = (float)(input("y0 (m)= "))
elevation = math.asin(math.sin(latitude_rad) * math.sin(Declination_rad) + math.cos(latitude_rad) * math.cos(Declination_rad) * math.cos(math.radians(Hour_deg))) # זווית גובה השמש מעל האופק
Azimuth = math.acos((math.sin(Declination_rad)-math.sin(math.radians(elevation)) *math.sin(latitude_rad)) / (math.cos(math.radians(elevation)) * math.cos(Declination_rad))) # זווית אזימוט השמש
sun_d = 1.49597870e11 * (1 - 0.0167 * math.cos(math.radians((2*math.pi)/365.25 * (Day-4)))) - 6371*1000 - y0 # מרחק השמש
gsun = (6.6743e-11 * (1.989e30))/(sun_d**2) # כוח המשיכה של השמש
newgY= g - math.sin(elevation)*  gsun # כוח המשיכה המשקלל
diameterSide = (float)(input("diameter from the side (m)= "))
diameterFront = (float)(input("diameter from the front (m)= "))
diameterbottom = (float)(input("diameter from the bottom (m)= "))
vwind = (float)(input("v of wind (m/s)= "))
p = (float)(input(" What is the air pressure: (mb)")) * 100
temp = (float)(input("Temperature (c)= ")) + 273.15 
wind_deg = (float)(input("deg of wind (deg)= ")) - degZ
radvwind = math.radians(wind_deg)
dens = p/ ((8.31446/0.028952) * temp) # צפיפות האוויר
if wind_deg < 45 or 105 < wind_deg < 225 or  wind_deg > 315:
    diameterforwind = diameterFront
else:
    diameterforwind = diameterSide
#mwind = dens * (diameterforwind**2 * math.pi) * vwind # מסה של האוויר
vwind_vec = vwind * math.cos(radvwind)
#u = (M * V + mwind * vwind_vec)/ M # (m1*v1) + (m2*v2)) = m1 * u1 בהתנגשות אלסטית 
cd = 0.47 # מקדם כיכוח אוויר או משהו

radY = math.radians(degY) 
radZ = math.radians(degZ)
# חילוק המהירות לארכים סקלרים
vy = V * math.sin(radY)
vx = V * math.cos(radY) * math.cos(radZ) 
vz = V * math.cos(radY) * math.sin(radZ)
volume = (math.pi * diameterbottom**3)/6
fbuoyancy = volume * dens * g # כוח הציפה
dt= 0.01
y = y0
dx = 0
dz = 0
t = 0

#u = (V * M- fdrag * t)/ M  # חישוב מהירות מחדש מחישוב מתקף
#ux = u * math.cos(radY)
#d = ux * t
while y >0:
    # 1. חישוב המהירות הכוללת הנוכחית של הקליע
    v_total = math.sqrt(vx**2 + vy**2 + vz**2)
    fdrag = 0.5 * dens * ((diameterFront**2 * math.pi)/ 4) * ((v_total + vwind_vec)**2) * cd # כוח החיכוח
   
    # 2. חישוב כוח הגרר לאותו רגע (לפי המהירות העדכנית)
    dh = (fbuoyancy * dt) / (M*g) 
    
    # 3. עדכון המהירויות:
    # תאוטה בגלל אוויר (F=m*a -> a=F/m)
    a_drag = fdrag / M
    # פירוק הגרר לצירים
    ax_drag = a_drag * (vx / v_total)
    ay_drag = a_drag * (vy / v_total)
    az_drag = a_drag * (vz / v_total)
    # חישוב מהירות מחדש לפי הכוחות
    vx = vx - ax_drag * dt
    vy = vy - newgY * dt - ay_drag * dt
    vz = vz - az_drag * dt

    # 5. עדכון המיקום הנוכחי לפי המהירות החדשה:
    dx = dx + vx * dt
    y = y + vy * dt + dh
    dz = dz + vz * dt
    
    # 6. קידום הזמן:
    t = t + dt
d = math.sqrt(dx**2 + dz**2)
d_local = d
d_invariant =  math.sqrt((dx + v_rotation_with / t)**2 + (dz + v_rotation_against / t)**2)
#  חישוב קורדינטות של נחיתה
dx_deg = dx/(111132.92- 559.82 * math.cos(2 * math.radians(latitude_deg))- 1.175 * math.cos(4 * math.radians(latitude_deg))) 
dz_deg = dz / (111412.84 * math.cos(math.radians(latitude_deg)) - 93.5 * math.cos(3 * math.radians(latitude_deg)) + 0.118 * math.cos(5 * math.radians(latitude_deg)))
NLatitude_deg = latitude_deg + dx_deg
NLongitude_deg = longitude_deg + dz_deg
print("the obcact weil end up in ", d,"m from the start", "in ",NLatitude_deg,", ",NLongitude_deg, " in valosoty of ", v_total ,"m/s", " in ", t,"seconds", "and traveled ", d_invariant, "m in the reference of the solar system" )