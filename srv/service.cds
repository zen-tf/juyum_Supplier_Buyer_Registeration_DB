using { RegistrationSessions as DB_RegistrationSessions } from '../db/schema';

service RegistrationService @(requires: 'authenticated-user') {
    entity RegistrationSessions as projection on DB_RegistrationSessions;

    // 1. 진행 중인 내역 존재 여부 확인 (신규 추가)
    function checkActiveSession() returns Boolean;

    // 2. 신규 세션 초기화 및 생성 (기존 startRegistration 대체)
    action initializeSession() returns String;
    
    // 3. 현재 상태 조회 및 다음 단계 안내 (이어서 하기 시 호출)
    function getNextStep() returns String;
    
    // 4. 상태 및 데이터 업데이트
    action updateState(
        status: String, 
        roleType: String, 
        isDomestic: Boolean, 
        taxId: String, 
        companyName: String
    ) returns String;

    // 5. 최종 등록 프로세스 실행
    action executeFinalRegistration() returns String;
}