# 바로화장실

서울시 개방·공중화장실 4,447곳을 지도에 표시하는 정적 웹사이트입니다.

## 실행

프로젝트 폴더를 HTTP 서버로 제공하세요. VS Code에서는 `skibidi_toilet.code-workspace`를 열고 Live Server로 `index.html`을 실행할 수 있습니다. 위치 기능은 HTTPS 또는 localhost에서 작동합니다. 별도 API 키나 빌드가 필요하지 않습니다.

기존 실습 자료는 `web_example/`에 보존했으며 GitHub 업로드에서는 제외했습니다.

## 구현

- Leaflet 1.9.4 + OpenStreetMap 표준 타일. 타일 이용 정책: https://operations.osmfoundation.org/policies/tiles/
- 브라우저 Geolocation으로 위치 확인. 권한 거부·시간 초과·부정확한 위치 처리 및 지도 출발지 선택.
- Haversine 직선거리 계산과 전체 데이터 정렬. 도보거리 최단 순위나 실시간 개방 여부는 계산하지 않습니다.
- 카카오맵 공식 `/link/by/walk/출발명,위도,경도/도착명,위도,경도`로 도보 길찾기 연결.
- 위치를 서버나 브라우저 저장소에 저장하지 않습니다. 지도 및 길찾기는 외부 서비스입니다.

## 데이터 출처

서울특별시 「서울시 공중화장실 위치정보」 OA-22586, 2026-09-14 수집. 공공누리 제1유형(출처 표시).
https://data.seoul.go.kr/dataList/OA-22586/S/1/datasetView.do

공식 JSON 내려받기: `https://datafile.seoul.go.kr/bigfile/iot/sheet/json/download.do`에 공식 화면의 폼 값 `srvType=S`, `infId=OA-22586`, `serviceKind=1`, `pageNo=1`, `ssUserId=SAMPLE_VIEW` 및 빈 `strWhere`, `strOrderby`, `filterCol`, `txtFilter`를 POST합니다.

`DATA`의 `objectid`, `conts_name`, `coord_y`, `coord_x`, `addr_new`(없으면 `addr_old`), `value_02`, `value_01`을 각각 `id`, `name`, `lat`, `lng`, `address`, `hours`, `type`으로 변환했습니다. 시간과 유형의 구분자 `|`를 공백으로 정리했습니다. 서울 주변 좌표 범위를 검증했으며 4,447개 레코드가 모두 통과했습니다. 정적 스냅샷이므로 자동 갱신되지 않습니다. 실제 운영시간과 출입 조건은 현장과 다를 수 있습니다.

## 검증

4,447개 고유 ID와 유효 좌표, 알려진 거리의 계산값, 최근접 정렬, 특수문자 URL 인코딩 확인. 브라우저에서 지도 타일·마커·목록 로드, 수동 출발지 재정렬, 카카오맵 도보 경로 연결 확인. 실제 기기의 GPS 권한과 위치 정확도는 사용자 환경에 따라 달라집니다.

