import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import './PersonalInformation.css';

// Comprehensive Head/GPO PIN Code & State map for major Indian cities
// Comprehensive Head/GPO PIN Code & State map for major Indian cities
const MAJOR_CITY_PIN_MAP: Record<
  string,
  { pin: string; city: string; district?: string; state: string }
> = {
  // Tamil Nadu
  chennai: { pin: '600001', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  madras: { pin: '600001', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  coimbatore: { pin: '641001', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu' },
  madurai: { pin: '625001', city: 'Madurai', district: 'Madurai', state: 'Tamil Nadu' },
  trichy: {
    pin: '620001',
    city: 'Tiruchirappalli',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
  },
  tiruchirappalli: {
    pin: '620001',
    city: 'Tiruchirappalli',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
  },
  salem: { pin: '636001', city: 'Salem', district: 'Salem', state: 'Tamil Nadu' },
  tirupur: { pin: '641601', city: 'Tirupur', district: 'Tirupur', state: 'Tamil Nadu' },
  vellore: { pin: '632001', city: 'Vellore', district: 'Vellore', state: 'Tamil Nadu' },
  erode: { pin: '638001', city: 'Erode', district: 'Erode', state: 'Tamil Nadu' },
  thanjavur: { pin: '613001', city: 'Thanjavur', district: 'Thanjavur', state: 'Tamil Nadu' },
  tirunelveli: { pin: '627001', city: 'Tirunelveli', district: 'Tirunelveli', state: 'Tamil Nadu' },
  thoothukudi: { pin: '628001', city: 'Thoothukudi', district: 'Thoothukudi', state: 'Tamil Nadu' },
  tuticorin: { pin: '628001', city: 'Thoothukudi', district: 'Thoothukudi', state: 'Tamil Nadu' },
  dindigul: { pin: '624001', city: 'Dindigul', district: 'Dindigul', state: 'Tamil Nadu' },
  kanchipuram: { pin: '631501', city: 'Kanchipuram', district: 'Kanchipuram', state: 'Tamil Nadu' },
  hosur: { pin: '635109', city: 'Hosur', district: 'Krishnagiri', state: 'Tamil Nadu' },
  krishnagiri: { pin: '635001', city: 'Krishnagiri', district: 'Krishnagiri', state: 'Tamil Nadu' },
  cuddalore: { pin: '607001', city: 'Cuddalore', district: 'Cuddalore', state: 'Tamil Nadu' },
  karur: { pin: '639001', city: 'Karur', district: 'Karur', state: 'Tamil Nadu' },
  nagercoil: { pin: '629001', city: 'Nagercoil', district: 'Kanyakumari', state: 'Tamil Nadu' },

  // Karnataka
  bengaluru: { pin: '560001', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka' },
  bangalore: { pin: '560001', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka' },
  mysuru: { pin: '570001', city: 'Mysuru', district: 'Mysuru', state: 'Karnataka' },
  mysore: { pin: '570001', city: 'Mysuru', district: 'Mysuru', state: 'Karnataka' },
  mangaluru: { pin: '575001', city: 'Mangaluru', district: 'Dakshina Kannada', state: 'Karnataka' },
  mangalore: { pin: '575001', city: 'Mangaluru', district: 'Dakshina Kannada', state: 'Karnataka' },
  hubballi: { pin: '580020', city: 'Hubballi', district: 'Dharwad', state: 'Karnataka' },
  hubli: { pin: '580020', city: 'Hubballi', district: 'Dharwad', state: 'Karnataka' },
  belagavi: { pin: '590001', city: 'Belagavi', district: 'Belagavi', state: 'Karnataka' },
  belgaum: { pin: '590001', city: 'Belagavi', district: 'Belagavi', state: 'Karnataka' },
  davangere: { pin: '577001', city: 'Davangere', district: 'Davangere', state: 'Karnataka' },
  ballari: { pin: '583101', city: 'Ballari', district: 'Ballari', state: 'Karnataka' },
  bellary: { pin: '583101', city: 'Ballari', district: 'Ballari', state: 'Karnataka' },
  shivamogga: { pin: '577201', city: 'Shivamogga', district: 'Shivamogga', state: 'Karnataka' },
  shimoga: { pin: '577201', city: 'Shivamogga', district: 'Shivamogga', state: 'Karnataka' },

  // Maharashtra
  mumbai: { pin: '400001', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra' },
  bombay: { pin: '400001', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra' },
  pune: { pin: '411001', city: 'Pune', district: 'Pune', state: 'Maharashtra' },
  nagpur: { pin: '440001', city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra' },
  nashik: { pin: '422001', city: 'Nashik', district: 'Nashik', state: 'Maharashtra' },
  thane: { pin: '400601', city: 'Thane', district: 'Thane', state: 'Maharashtra' },
  aurangabad: {
    pin: '431001',
    city: 'Chhatrapati Sambhajinagar',
    district: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
  },
  chhatrapatisambhajinagar: {
    pin: '431001',
    city: 'Chhatrapati Sambhajinagar',
    district: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
  },
  solapur: { pin: '413001', city: 'Solapur', district: 'Solapur', state: 'Maharashtra' },
  kolhapur: { pin: '416001', city: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra' },
  navimumbai: { pin: '400703', city: 'Navi Mumbai', district: 'Thane', state: 'Maharashtra' },

  // Delhi NCR
  delhi: { pin: '110001', city: 'Delhi', district: 'Central Delhi', state: 'Delhi' },
  newdelhi: { pin: '110001', city: 'New Delhi', district: 'Central Delhi', state: 'Delhi' },
  noida: { pin: '201301', city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  gurugram: { pin: '122001', city: 'Gurugram', district: 'Gurugram', state: 'Haryana' },
  gurgaon: { pin: '122001', city: 'Gurugram', district: 'Gurugram', state: 'Haryana' },
  faridabad: { pin: '121001', city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  ghaziabad: { pin: '201001', city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },

  // Telangana & Andhra Pradesh
  hyderabad: { pin: '500001', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana' },
  secunderabad: { pin: '500003', city: 'Secunderabad', district: 'Hyderabad', state: 'Telangana' },
  warangal: { pin: '506001', city: 'Warangal', district: 'Warangal', state: 'Telangana' },
  visakhapatnam: {
    pin: '530001',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
  },
  vizag: {
    pin: '530001',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
  },
  vijayawada: { pin: '520001', city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh' },
  guntur: { pin: '522001', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh' },
  tirupati: { pin: '517501', city: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh' },
  kakinada: { pin: '533001', city: 'Kakinada', district: 'Kakinada', state: 'Andhra Pradesh' },
  rajahmundry: {
    pin: '533101',
    city: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
  },
  nellore: { pin: '524001', city: 'Nellore', district: 'SPSR Nellore', state: 'Andhra Pradesh' },
  kurnool: { pin: '518001', city: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh' },

  // West Bengal
  kolkata: { pin: '700001', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal' },
  calcutta: { pin: '700001', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal' },
  howrah: { pin: '711101', city: 'Howrah', district: 'Howrah', state: 'West Bengal' },
  siliguri: { pin: '734001', city: 'Siliguri', district: 'Darjeeling', state: 'West Bengal' },
  durgapur: {
    pin: '713201',
    city: 'Durgapur',
    district: 'Paschim Bardhaman',
    state: 'West Bengal',
  },

  // Gujarat
  ahmedabad: { pin: '380001', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat' },
  surat: { pin: '395001', city: 'Surat', district: 'Surat', state: 'Gujarat' },
  vadodara: { pin: '390001', city: 'Vadodara', district: 'Vadodara', state: 'Gujarat' },
  baroda: { pin: '390001', city: 'Vadodara', district: 'Vadodara', state: 'Gujarat' },
  rajkot: { pin: '360001', city: 'Rajkot', district: 'Rajkot', state: 'Gujarat' },
  bhavnagar: { pin: '364001', city: 'Bhavnagar', district: 'Bhavnagar', state: 'Gujarat' },
  jamnagar: { pin: '361001', city: 'Jamnagar', district: 'Jamnagar', state: 'Gujarat' },

  // Kerala
  kochi: { pin: '682001', city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  cochin: { pin: '682001', city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  ernakulam: { pin: '682001', city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  thiruvananthapuram: {
    pin: '695001',
    city: 'Thiruvananthapuram',
    district: 'Thiruvananthapuram',
    state: 'Kerala',
  },
  trivandrum: {
    pin: '695001',
    city: 'Thiruvananthapuram',
    district: 'Thiruvananthapuram',
    state: 'Kerala',
  },
  kozhikode: { pin: '673001', city: 'Kozhikode', district: 'Kozhikode', state: 'Kerala' },
  calicut: { pin: '673001', city: 'Kozhikode', district: 'Kozhikode', state: 'Kerala' },
  thrissur: { pin: '680001', city: 'Thrissur', district: 'Thrissur', state: 'Kerala' },
  kollam: { pin: '691001', city: 'Kollam', district: 'Kollam', state: 'Kerala' },
  kottayam: { pin: '686001', city: 'Kottayam', district: 'Kottayam', state: 'Kerala' },
  kannur: { pin: '670001', city: 'Kannur', district: 'Kannur', state: 'Kerala' },

  // Uttar Pradesh
  lucknow: { pin: '226001', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh' },
  kanpur: { pin: '208001', city: 'Kanpur', district: 'Kanpur Nagar', state: 'Uttar Pradesh' },
  agra: { pin: '282001', city: 'Agra', district: 'Agra', state: 'Uttar Pradesh' },
  varanasi: { pin: '221001', city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh' },
  banaras: { pin: '221001', city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh' },
  meerut: { pin: '250001', city: 'Meerut', district: 'Meerut', state: 'Uttar Pradesh' },
  prayagraj: { pin: '211001', city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh' },
  allahabad: { pin: '211001', city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh' },

  // Other States / Capitals
  jaipur: { pin: '302001', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan' },
  jodhpur: { pin: '342001', city: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan' },
  udaipur: { pin: '313001', city: 'Udaipur', district: 'Udaipur', state: 'Rajasthan' },
  chandigarh: { pin: '160001', city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh' },
  indore: { pin: '452001', city: 'Indore', district: 'Indore', state: 'Madhya Pradesh' },
  bhopal: { pin: '462001', city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh' },
  patna: { pin: '800001', city: 'Patna', district: 'Patna', state: 'Bihar' },
  ranchi: { pin: '834001', city: 'Ranchi', district: 'Ranchi', state: 'Jharkhand' },
  bhubaneswar: { pin: '751001', city: 'Bhubaneswar', district: 'Khurda', state: 'Odisha' },
  guwahati: { pin: '781001', city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam' },
  ludhiana: { pin: '141001', city: 'Ludhiana', district: 'Ludhiana', state: 'Punjab' },
  amritsar: { pin: '143001', city: 'Amritsar', district: 'Amritsar', state: 'Punjab' },
  dehradun: { pin: '248001', city: 'Dehradun', district: 'Dehradun', state: 'Uttarakhand' },
  shimla: { pin: '171001', city: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh' },
  jammu: { pin: '180001', city: 'Jammu', district: 'Jammu', state: 'Jammu & Kashmir' },
  srinagar: { pin: '190001', city: 'Srinagar', district: 'Srinagar', state: 'Jammu & Kashmir' },
  puducherry: { pin: '605001', city: 'Puducherry', district: 'Puducherry', state: 'Puducherry' },
  pondicherry: { pin: '605001', city: 'Puducherry', district: 'Puducherry', state: 'Puducherry' },
  raipur: { pin: '492001', city: 'Raipur', district: 'Raipur', state: 'Chhattisgarh' },
  panaji: { pin: '403001', city: 'Panaji', district: 'North Goa', state: 'Goa' },
};

export interface FamilyMemberRecord {
  id: string;
  name: string;
  relationship: string;
  otherRelationship?: string;
  dob: string;
  countryCode: string;
  phone: string;
}

export interface NomineeRecord {
  id: string;
  name: string;
  relationship: string;
  otherRelationship?: string;
  sharePercentage: number | '';
}

interface PersonalInformationProps {
  employeeId: string;
}

export function PersonalInformation({ employeeId }: PersonalInformationProps) {
  // 1. Profile Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // 3-6. Name fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');

  // 7. Gender
  const [gender, setGender] = useState('Male');
  const [otherGender, setOtherGender] = useState('');

  // 8. Date of Birth
  const [dob, setDob] = useState('');

  // 9. Marital Status
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [otherMaritalStatus, setOtherMaritalStatus] = useState('');

  // 10. Blood Group
  const [bloodGroup, setBloodGroup] = useState('O+');

  // 11. Nationality
  const [nationality, setNationality] = useState('Indian');
  const [otherNationality, setOtherNationality] = useState('');

  // 12. Native Language
  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [otherNativeLanguage, setOtherNativeLanguage] = useState('');

  // 13-14. Parents / Guardian
  const [fatherName, setFatherName] = useState('');
  const [guardianName, setGuardianName] = useState('');

  // 15. Family Members (Repeatable)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRecord[]>([
    {
      id: 'fam_1',
      name: '',
      relationship: 'Spouse',
      dob: '',
      countryCode: '+91',
      phone: '',
    },
  ]);

  // 16. Nomination Details (Repeatable)
  const [nominees, setNominees] = useState<NomineeRecord[]>([
    {
      id: 'nom_1',
      name: '',
      relationship: 'Spouse',
      sharePercentage: 100,
    },
  ]);

  // 17. Time Zone
  const [timeZone, setTimeZone] = useState('(GMT+05:30) Asia/Kolkata (IST)');

  // 18-21. Phones
  const [mobileCountryCode, setMobileCountryCode] = useState('+91');
  const [mobilePhone, setMobilePhone] = useState('');

  const [homeCountryCode, setHomeCountryCode] = useState('+91');
  const [homePhone, setHomePhone] = useState('');

  const [businessCountryCode, setBusinessCountryCode] = useState('+91');
  const [businessPhone, setBusinessPhone] = useState('');

  const [workCountryCode, setWorkCountryCode] = useState('+91');
  const [workPhone, setWorkPhone] = useState('');

  // 22. Email Address
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // 23-28. Address Details
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');
  const [postalStatus, setPostalStatus] = useState<string | null>(null);
  const [postalLoading, setPostalLoading] = useState(false);

  const [cityStatus, setCityStatus] = useState<string | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [availablePincodes, setAvailablePincodes] = useState<
    Array<{ name: string; pincode: string; state: string }>
  >([]);

  const cityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Photo Upload Handler
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Real Postal API Lookup by 6-digit PIN Code
  useEffect(() => {
    const cleanPin = pinCode.trim();
    if (/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setPostalLoading(true);
      setPostalStatus('Fetching location details...');
      fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
        .then((res) => res.json())
        .then((data) => {
          setPostalLoading(false);
          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            const fetchedDistrict = po.District || '';
            const fetchedState = po.State;
            const fetchedCountry = po.Country || 'India';

            setPostalStatus(
              `Verified: ${po.District || po.Name}, ${fetchedState}, ${fetchedCountry}`,
            );
            if (fetchedDistrict) setDistrict(fetchedDistrict);
            // Only set city if city is currently empty (prevent overwriting user-typed city with District)
            if (!city) {
              const cityCandidate =
                po.Block && po.Block !== 'NA'
                  ? po.Block
                  : po.Name !== po.District
                    ? po.Name
                    : po.District;
              setCity(cityCandidate);
            }
            setState(fetchedState);
            setCountry(fetchedCountry);
          } else {
            setPostalStatus('PIN code not found in official registry.');
          }
        })
        .catch(() => {
          setPostalLoading(false);
          setPostalStatus(null);
        });
    } else {
      setPostalStatus(null);
    }
  }, [pinCode, city]);

  // 2. City Name Lookup -> Auto-generates PIN Code & State
  const handleCityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCity(val);

    const normalized = val
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (cityTimerRef.current) {
      clearTimeout(cityTimerRef.current);
    }

    // Direct match in local dictionary for 100% instant accuracy on major Indian cities
    if (MAJOR_CITY_PIN_MAP[normalized]) {
      const match = MAJOR_CITY_PIN_MAP[normalized]!;
      setPinCode(match.pin);
      setDistrict(match.district || match.city);
      setState(match.state);
      setCountry('India');
      setCityStatus(`Auto-generated PIN: ${match.pin} (${match.state})`);
      setAvailablePincodes([]);
      setCityLoading(false);
      return;
    }

    // Debounced API search for other cities/towns in India
    const cleanCity = val.trim();
    if (cleanCity.length >= 3) {
      setCityLoading(true);
      setCityStatus('Fetching PIN code for city...');

      cityTimerRef.current = setTimeout(() => {
        fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(cleanCity)}`)
          .then((res) => res.json())
          .then((data) => {
            setCityLoading(false);
            if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
              const offices: Array<{
                Name: string;
                Pincode: string;
                State: string;
                District: string;
              }> = data[0].PostOffice;

              // Find best matching post office (GPO, HO, District match, or prefix match)
              const lowerCity = cleanCity.toLowerCase();
              const bestMatch =
                offices.find(
                  (o) =>
                    o.Name.toLowerCase().includes('g.p.o') ||
                    o.Name.toLowerCase().includes('gpo') ||
                    o.Name.toLowerCase().includes('h.o'),
                ) ||
                offices.find((o) => o.District && o.District.toLowerCase() === lowerCity) ||
                offices.find((o) => o.Name.toLowerCase().startsWith(lowerCity)) ||
                offices[0]!;

              setPinCode(bestMatch.Pincode);
              if (bestMatch.District) setDistrict(bestMatch.District);
              if (bestMatch.State) setState(bestMatch.State);
              setCountry('India');
              setCityStatus(`Auto-generated PIN: ${bestMatch.Pincode} (${bestMatch.State})`);

              // Extract unique PIN codes for area selector dropdown
              const uniquePins = new Map<
                string,
                { name: string; pincode: string; state: string }
              >();
              offices.forEach((o) => {
                if (!uniquePins.has(o.Pincode)) {
                  uniquePins.set(o.Pincode, {
                    name: o.Name,
                    pincode: o.Pincode,
                    state: o.State,
                  });
                }
              });
              setAvailablePincodes(Array.from(uniquePins.values()).slice(0, 15));
            } else {
              setCityStatus(null);
              setAvailablePincodes([]);
            }
          })
          .catch(() => {
            setCityLoading(false);
            setCityStatus(null);
          });
      }, 400);
    } else {
      setCityLoading(false);
      setCityStatus(null);
      setAvailablePincodes([]);
    }
  };

  // Email Validation
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val && !/\S+@\S+\.\S+/.test(val)) {
      setEmailError('Please enter a valid email address (e.g. user@example.com)');
    } else {
      setEmailError(null);
    }
  };

  // Family Member Operations
  const addFamilyMember = () => {
    setFamilyMembers([
      ...familyMembers,
      {
        id: `fam_${Date.now()}`,
        name: '',
        relationship: 'Spouse',
        dob: '',
        countryCode: '+91',
        phone: '',
      },
    ]);
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter((f) => f.id !== id));
  };

  const updateFamilyMember = (id: string, field: keyof FamilyMemberRecord, value: string) => {
    setFamilyMembers(familyMembers.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  // Nominee Operations
  const addNominee = () => {
    setNominees([
      ...nominees,
      {
        id: `nom_${Date.now()}`,
        name: '',
        relationship: 'Spouse',
        sharePercentage: 0,
      },
    ]);
  };

  const removeNominee = (id: string) => {
    setNominees(nominees.filter((n) => n.id !== id));
  };

  const updateNominee = (id: string, field: keyof NomineeRecord, value: string | number) => {
    setNominees(nominees.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  return (
    <div className="personal-info">
      {/* SECTION 1: PERSONAL DETAILS */}
      <div className="personal-info__group">
        <h3 className="personal-info__group-title">Personal Details</h3>

        {/* 1. Profile Photo */}
        <div className="personal-info__photo-container">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile Preview"
              className="personal-info__photo-preview"
            />
          ) : (
            <div className="personal-info__photo-placeholder">
              {firstName ? firstName[0]?.toUpperCase() : '👤'}
            </div>
          )}
          <div className="personal-info__photo-meta">
            <span className="personal-info__photo-title">Profile Photo</span>
            <span className="personal-info__photo-hint">Supports JPG, PNG under 5MB</span>
            <div className="personal-info__photo-actions">
              <label className="personal-info__upload-btn">
                Upload Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoChange}
                  className="personal-info__file-input"
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  className="personal-info__remove-photo-btn"
                  onClick={() => setPhotoPreview(null)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="employee-registration__form-grid">
          {/* 2. Employee ID (Read-only) */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Employee ID <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              value={employeeId}
              readOnly
              className="employee-registration__input employee-registration__input--disabled"
            />
          </div>

          {/* 3. First Name */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              First Name <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Arun"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* 4. Middle Name */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">Middle Name</label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Kumar"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>

          {/* 5. Last Name */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Last Name <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Sharma"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          {/* 6. Preferred Name */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">Preferred Name</label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Arun"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
            />
          </div>

          {/* 7. Gender */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Gender <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
            {gender === 'Other' && (
              <div className="employee-registration__other-container">
                <input
                  type="text"
                  className="employee-registration__input"
                  placeholder="Enter Gender..."
                  value={otherGender}
                  onChange={(e) => setOtherGender(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 8. Date of Birth */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Date of Birth <span className="employee-registration__required">*</span>
            </label>
            <input
              type="date"
              className="employee-registration__input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          {/* 9. Marital Status */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Marital Status <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Other">Other</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
            {maritalStatus === 'Other' && (
              <div className="employee-registration__other-container">
                <input
                  type="text"
                  className="employee-registration__input"
                  placeholder="Enter Marital Status..."
                  value={otherMaritalStatus}
                  onChange={(e) => setOtherMaritalStatus(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 10. Blood Group */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Blood Group <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
          </div>

          {/* 11. Nationality */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Nationality <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              >
                <option value="Indian">Indian</option>
                <option value="American">American</option>
                <option value="British">British</option>
                <option value="Canadian">Canadian</option>
                <option value="Australian">Australian</option>
                <option value="Emirati">Emirati</option>
                <option value="Singaporean">Singaporean</option>
                <option value="Other">Other</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
            {nationality === 'Other' && (
              <div className="employee-registration__other-container">
                <input
                  type="text"
                  className="employee-registration__input"
                  placeholder="Enter Nationality..."
                  value={otherNationality}
                  onChange={(e) => setOtherNationality(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 12. Native Language */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Native Language <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Bengali">Bengali</option>
                <option value="Marathi">Marathi</option>
                <option value="Kannada">Kannada</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Punjabi">Punjabi</option>
                <option value="Other">Other</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
            {nativeLanguage === 'Other' && (
              <div className="employee-registration__other-container">
                <input
                  type="text"
                  className="employee-registration__input"
                  placeholder="Enter Native Language..."
                  value={otherNativeLanguage}
                  onChange={(e) => setOtherNativeLanguage(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 13. Father's Name */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">Father&apos;s Name</label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Ramesh Kumar"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
            />
          </div>

          {/* 14. Guardian Name */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">Guardian Name</label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Guardian Name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: FAMILY & NOMINATION */}
      <div className="personal-info__group">
        <h3 className="personal-info__group-title">Family &amp; Nomination</h3>

        {/* 15. Family Members (Repeatable) */}
        <div className="personal-info__field personal-info__field--full">
          <label className="employee-registration__label personal-info__label-margin">
            Family Members
          </label>
          <div className="personal-info__repeatable-list">
            {familyMembers.map((fam, idx) => (
              <div key={fam.id} className="personal-info__repeatable-card">
                <div className="personal-info__repeatable-header">
                  <span className="personal-info__repeatable-title">Member #{idx + 1}</span>
                  {familyMembers.length > 1 && (
                    <button
                      type="button"
                      className="personal-info__remove-item-btn"
                      onClick={() => removeFamilyMember(fam.id)}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <div className="employee-registration__form-grid">
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Name</label>
                    <input
                      type="text"
                      className="employee-registration__input"
                      placeholder="Full Name"
                      value={fam.name}
                      onChange={(e) => updateFamilyMember(fam.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Relationship</label>
                    <div className="employee-registration__select-wrapper">
                      <select
                        className="employee-registration__select"
                        value={fam.relationship}
                        onChange={(e) => updateFamilyMember(fam.id, 'relationship', e.target.value)}
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Other">Other</option>
                      </select>
                      <span className="employee-registration__select-icon">▼</span>
                    </div>
                    {fam.relationship === 'Other' && (
                      <div className="employee-registration__other-container">
                        <input
                          type="text"
                          className="employee-registration__input"
                          placeholder="Enter Relationship..."
                          value={fam.otherRelationship || ''}
                          onChange={(e) =>
                            updateFamilyMember(fam.id, 'otherRelationship', e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Date of Birth</label>
                    <input
                      type="date"
                      className="employee-registration__input"
                      value={fam.dob}
                      onChange={(e) => updateFamilyMember(fam.id, 'dob', e.target.value)}
                    />
                  </div>
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Phone</label>
                    <div className="personal-info__phone-row">
                      <select
                        className="personal-info__country-code-select"
                        value={fam.countryCode}
                        onChange={(e) => updateFamilyMember(fam.id, 'countryCode', e.target.value)}
                      >
                        <option value="+91">+91 (IN)</option>
                        <option value="+1">+1 (US)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+971">+971 (UAE)</option>
                      </select>
                      <input
                        type="tel"
                        className="employee-registration__input"
                        placeholder="Phone Number"
                        value={fam.phone}
                        onChange={(e) => updateFamilyMember(fam.id, 'phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="personal-info__add-repeatable-btn"
              onClick={addFamilyMember}
            >
              + Add Family Member
            </button>
          </div>
        </div>

        {/* 16. Nomination Details (Repeatable) */}
        <div className="personal-info__field personal-info__field--full personal-info__repeatable-section-gap">
          <label className="employee-registration__label personal-info__label-margin">
            Nomination Details
          </label>
          <div className="personal-info__repeatable-list">
            {nominees.map((nom, idx) => (
              <div key={nom.id} className="personal-info__repeatable-card">
                <div className="personal-info__repeatable-header">
                  <span className="personal-info__repeatable-title">Nominee #{idx + 1}</span>
                  {nominees.length > 1 && (
                    <button
                      type="button"
                      className="personal-info__remove-item-btn"
                      onClick={() => removeNominee(nom.id)}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <div className="employee-registration__form-grid">
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Nominee Name</label>
                    <input
                      type="text"
                      className="employee-registration__input"
                      placeholder="Full Name"
                      value={nom.name}
                      onChange={(e) => updateNominee(nom.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Relationship</label>
                    <div className="employee-registration__select-wrapper">
                      <select
                        className="employee-registration__select"
                        value={nom.relationship}
                        onChange={(e) => updateNominee(nom.id, 'relationship', e.target.value)}
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                      <span className="employee-registration__select-icon">▼</span>
                    </div>
                    {nom.relationship === 'Other' && (
                      <div className="employee-registration__other-container">
                        <input
                          type="text"
                          className="employee-registration__input"
                          placeholder="Enter Relationship..."
                          value={nom.otherRelationship || ''}
                          onChange={(e) =>
                            updateNominee(nom.id, 'otherRelationship', e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Share % (1-100)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="employee-registration__input"
                      placeholder="100"
                      value={nom.sharePercentage}
                      onChange={(e) =>
                        updateNominee(nom.id, 'sharePercentage', Number(e.target.value) || '')
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="personal-info__add-repeatable-btn"
              onClick={addNominee}
            >
              + Add Nominee
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: CONTACT DETAILS */}
      <div className="personal-info__group">
        <h3 className="personal-info__group-title">Contact Details</h3>

        <div className="employee-registration__form-grid">
          {/* 17. Time Zone */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Time Zone <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
              >
                <option value="(GMT+05:30) Asia/Kolkata (IST)">
                  (GMT+05:30) India Standard Time (Asia/Kolkata)
                </option>
                <option value="(GMT+00:00) UTC">
                  (GMT+00:00) UTC (Coordinated Universal Time)
                </option>
                <option value="(GMT-05:00) America/New_York (EST)">
                  (GMT-05:00) Eastern Time (US &amp; Canada)
                </option>
                <option value="(GMT+04:00) Asia/Dubai (GST)">
                  (GMT+04:00) Gulf Standard Time (Dubai)
                </option>
                <option value="(GMT+08:00) Asia/Singapore (SGT)">(GMT+08:00) Singapore Time</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
          </div>

          {/* 18. Mobile Phone */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Mobile Phone <span className="employee-registration__required">*</span>
            </label>
            <div className="personal-info__phone-row">
              <select
                className="personal-info__country-code-select"
                value={mobileCountryCode}
                onChange={(e) => setMobileCountryCode(e.target.value)}
              >
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+971">+971 (UAE)</option>
                <option value="+65">+65 (SG)</option>
              </select>
              <input
                type="tel"
                className="employee-registration__input"
                placeholder="e.g. 98765 43210"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
              />
            </div>
          </div>

          {/* 19. Home Phone */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">Home Phone</label>
            <div className="personal-info__phone-row">
              <select
                className="personal-info__country-code-select"
                value={homeCountryCode}
                onChange={(e) => setHomeCountryCode(e.target.value)}
              >
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+971">+971 (UAE)</option>
              </select>
              <input
                type="tel"
                className="employee-registration__input"
                placeholder="Landline number"
                value={homePhone}
                onChange={(e) => setHomePhone(e.target.value)}
              />
            </div>
          </div>

          {/* 20. Business Phone */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">Business Phone</label>
            <div className="personal-info__phone-row">
              <select
                className="personal-info__country-code-select"
                value={businessCountryCode}
                onChange={(e) => setBusinessCountryCode(e.target.value)}
              >
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+971">+971 (UAE)</option>
              </select>
              <input
                type="tel"
                className="employee-registration__input"
                placeholder="Office extension"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />
            </div>
          </div>

          {/* 21. Work Phone */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">Work Phone</label>
            <div className="personal-info__phone-row">
              <select
                className="personal-info__country-code-select"
                value={workCountryCode}
                onChange={(e) => setWorkCountryCode(e.target.value)}
              >
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+971">+971 (UAE)</option>
              </select>
              <input
                type="tel"
                className="employee-registration__input"
                placeholder="Direct work line"
                value={workPhone}
                onChange={(e) => setWorkPhone(e.target.value)}
              />
            </div>
          </div>

          {/* 22. Email Address */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Email Address <span className="employee-registration__required">*</span>
            </label>
            <input
              type="email"
              className="employee-registration__input"
              placeholder="e.g. employee@company.com"
              value={email}
              onChange={handleEmailChange}
            />
            {emailError && <span className="personal-info__error-hint">{emailError}</span>}
          </div>
        </div>
      </div>

      {/* SECTION 4: ADDRESS DETAILS */}
      <div className="personal-info__group">
        <h3 className="personal-info__group-title">Address Details</h3>

        <div className="employee-registration__form-grid">
          {/* 23. Street (Full width) */}
          <div className="employee-registration__field personal-info__field--full">
            <label className="employee-registration__label">
              Street <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="Building, Flat No., Street, Area"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          {/* 26. PIN Code (Placed first for auto-fill flow) */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              PIN Code (India) <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              maxLength={6}
              className="employee-registration__input"
              placeholder="e.g. 600001"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
            />
            {postalLoading && (
              <span className="personal-info__photo-hint">Looking up PIN code...</span>
            )}
            {postalStatus && <span className="personal-info__postal-status">✓ {postalStatus}</span>}
          </div>

          {/* 24. City */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              City <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Hosur, Chennai, Tambaram"
              value={city}
              onChange={handleCityChange}
            />
            {cityLoading && (
              <span className="personal-info__photo-hint">Searching postal PIN code...</span>
            )}
            {cityStatus && <span className="personal-info__postal-status">✓ {cityStatus}</span>}

            {availablePincodes.length > 1 && (
              <div className="employee-registration__other-container personal-info__dropdown-margin">
                <select
                  className="employee-registration__select personal-info__pincode-select"
                  value={pinCode}
                  onChange={(e) => {
                    setPinCode(e.target.value);
                    const sel = availablePincodes.find((p) => p.pincode === e.target.value);
                    if (sel) {
                      setCityStatus(`Selected PIN: ${sel.pincode} (${sel.name})`);
                    }
                  }}
                >
                  <option value="">Select specific area PIN code...</option>
                  {availablePincodes.map((p) => (
                    <option key={p.pincode} value={p.pincode}>
                      {p.pincode} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* District */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              District <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Krishnagiri, Chengalpattu"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>

          {/* 25. State */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              State <span className="employee-registration__required">*</span>
            </label>
            <input
              type="text"
              className="employee-registration__input"
              placeholder="e.g. Tamil Nadu"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          {/* 27. Country */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Country <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Singapore">Singapore</option>
                <option value="Australia">Australia</option>
                <option value="Canada">Canada</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
