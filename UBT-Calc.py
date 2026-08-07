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
latitude_deg = (float)(input(" What is your latitude? (°): "))
latitude_rad = math.radians(latitude_deg)
longitude_deg = (float)(input(" What is your longitude? (°): "))
g = calc_gravity(latitude_deg) # משתמש בפונקציה מקודם
Day = (float)(input("What is the day of the year?"))
Hour = (float)(input("What is the hour of the day? (24 hours format)"))
Declination = 23.45 * math.sin(math.radians(360/365 * (Day-81)))
Declination_rad = math.radians(Declination)
Hour_deg =  15 * (Hour-12)
V = (float)(input("v (m/s)= "))
degY = (float)(input("deg up/down (deg)= "))
degZ = (float)(input("deg right+/left- (deg)= "))
M = (float)(input("m (kg)= "))
y0 = (float)(input("y0 (m)= "))
elevation = math.asin(math.sin(latitude_rad) * math.sin(Declination_rad) + math.cos(latitude_rad) * math.cos(Declination_rad) * math.cos(math.radians(Hour_deg)))
Azimuth = math.acos((math.sin(Declination_rad)-math.sin(math.radians(elevation)) *math.sin(latitude_rad)) / (math.cos(math.radians(elevation)) * math.cos(Declination_rad)))
sun_d = 1.49597870e11 * (1 - 0.0167 * math.cos(math.radians((2*math.pi)/365.25 * (Day-4)))) - 6371*1000 - y0
gsun = (6.6743e-11 * (1.989e30))/(sun_d**2)
newgY= g - math.sin(elevation)*  gsun
diameterSide = (float)(input("diameter from the side (m)= "))
diameterFront = (float)(input("diameter from the front (m)= "))
vwind = (float)(input("v of wind (m/s)= "))
p = (float)(input(" What is the air pressure: (mb)"))
temp = (float)(input("Temperature (c)= ")) + 273.15
wind_deg = (float)(input("deg of wind (m/s)= ")) - degZ
radvwind = math.radians(wind_deg)
dens = p/ ((8.31446/0.028952) * temp) # צפיפות האוויר
if wind_deg < 45 or 105 < wind_deg < 225 or  wind_deg > 315:
    diameterforwind = diameterFront
else:
    diameterforwind = diameterSide
mwind = dens * diameterforwind * vwind # מסה של האוויר
vwind_vec = vwind * math.cos(radvwind) # xמיראות האוויר הציר ה
u = (M * V + mwind * vwind_vec)/ M # (m1*v1) + (m2*v2)) = m1 * u1 בהתנגשות אלסטית 
cd = (2 * M * g ) / (dens * diameterforwind * u**2) # מקדם כיכוח אוויר או משהו
fdrag = 0.5 * dens * diameterFront * u**2 * cd # כוח החיכוח
radY = math.radians(degY) 
radZ = math.radians(degZ)
vx = u * math.cos(radY)
vy = u * math.sin(radY)
t = (vy + math.sqrt(vy**2 +2 * g * y0))/g # אין לי מושג
u = (u * M- fdrag * t)/ M  # חישוב מהירות מחדש מחישוב מתקף
ux = u * math.cos(radY)
d = ux * t
dx = d * math.cos(radZ)
dz = d * math.sin(radZ)
#  חישוב קורדינטות של נחיתה
dx_deg = dx/(111132.92- 559.82 * math.cos(2 * math.radians(latitude_deg))- 1.175 * math.cos(4 * math.radians(latitude_deg))) 
dz_deg = dz/ (111412.84 * math.cos(math.radians(longitude_deg))- 93.5 * math.cos(3 * math.radians(longitude_deg)) + 0.118 * math.cos(5 * math.radians(longitude_deg)))
NLatitude_deg = latitude_deg + dx_deg
NLongitude_deg = longitude_deg + dz_deg
print("the obcact weil end up in ", d,"m from the start", "in ",NLatitude_deg,", ",NLongitude_deg, " in valosoty of ", u,"m/s" )